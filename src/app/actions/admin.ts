'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';
import type { JlptLevel, Role } from '@/lib/domain';
import type { TagWithVocabInput } from '@/lib/ports/db-port';

function jlpt(value: string | null): JlptLevel | null {
  const v = String(value ?? '');
  return v && ['N1','N2','N3','N4','N5'].includes(v) ? (v as JlptLevel) : null;
}

function parseTranslations(formData: FormData): { locale: string; meaning: string }[] {
  const out: { locale: string; meaning: string }[] = [];
  for (const locale of ['id', 'en']) {
    const meaning = String(formData.get(`meaning_${locale}`) ?? '').trim();
    if (meaning) out.push({ locale, meaning });
  }
  return out;
}

function parseDynamic(formData: FormData, key: string): string[] {
  const out: string[] = [];
  for (let i = 0; i < 50; i++) {
    const value = String(formData.get(`${key}[${i}]`) ?? '').trim();
    if (value) out.push(value);
  }
  return out;
}

export async function createVocabularyAction(formData: FormData): Promise<void> {
  await requireRole('admin', 'super_admin');
  const repo = await getRepository();

  const hiragana = String(formData.get('hiragana') ?? '').trim();
  if (!hiragana) throw new Error('Hiragana is required');

  const romaji = String(formData.get('romaji') ?? '').trim() || null;
  const kanji = String(formData.get('kanji') ?? '').trim() || null;
  const partOfSpeech = String(formData.get('partOfSpeech') ?? '').trim() || null;
  const translations = parseTranslations(formData);

  const examples: TagWithVocabInput['examples'] = [];
  const jpExamples = parseDynamic(formData, 'exampleJp');
  for (let i = 0; i < jpExamples.length; i++) {
    const t: { locale: string; translation: string }[] = [];
    for (const locale of ['id', 'en']) {
      const translation = String(formData.get(`exampleTr_${i}_${locale}`) ?? '').trim();
      if (translation) t.push({ locale, translation });
    }
    examples.push({ japanese: jpExamples[i], translations: t });
  }

  const collocations: TagWithVocabInput['collocations'] = [];
  const collocTexts = parseDynamic(formData, 'collocation');
  for (let i = 0; i < collocTexts.length; i++) {
    collocations.push({
      collocation: collocTexts[i],
      meaning: String(formData.get(`collocationMeaning[${i}]`) ?? '').trim() || null,
    });
  }

  await repo.createVocabulary(
    { kanji, hiragana, romaji, jlptLevel: jlpt(formData.get('jlptLevel') as string | null), partOfSpeech, translations, examples, collocations },
    null,
  );
  revalidatePath('/admin');
}

export async function upsertVocabularyAction(formData: FormData): Promise<void> {
  await requireRole('admin', 'super_admin');
  const repo = await getRepository();

  const id = Number(formData.get('id'));
  const hiragana = String(formData.get('hiragana') ?? '').trim();
  if (!hiragana) throw new Error('Hiragana is required');

  const romaji = String(formData.get('romaji') ?? '').trim() || null;
  const kanji = String(formData.get('kanji') ?? '').trim() || null;
  const partOfSpeech = String(formData.get('partOfSpeech') ?? '').trim() || null;
  const translations = parseTranslations(formData);

  if (Number.isFinite(id) && id > 0) {
    await repo.updateVocabulary(id, {
      kanji, hiragana, romaji, jlptLevel: jlpt(formData.get('jlptLevel') as string | null), partOfSpeech, translations,
    });
  } else {
    await repo.createVocabulary(
      { kanji, hiragana, romaji, jlptLevel: jlpt(formData.get('jlptLevel') as string | null), partOfSpeech, translations },
      null,
    );
  }
  revalidatePath('/admin');
}

export async function removeVocabularyAction(_formData: FormData): Promise<void> {
  await requireRole('admin', 'super_admin');
  revalidatePath('/admin');
}

export async function createDeckAction(formData: FormData): Promise<void> {
  await requireRole('admin', 'super_admin');
  const repo = await getRepository();
  const title = String(formData.get('title') ?? '').trim();
  if (!title) throw new Error('Deck title is required');
  await repo.createDeck(
    {
      title,
      subtitle: String(formData.get('subtitle') ?? '').trim() || null,
      jlptLevel: jlpt(formData.get('jlptLevel') as string | null),
      orderIndex: Number(formData.get('orderIndex') ?? Date.now()),
      isPublished: formData.get('published') === 'on',
    },
    null,
  );
  revalidatePath('/admin');
}

export async function updateDeckAction(formData: FormData): Promise<void> {
  await requireRole('admin', 'super_admin');
  const repo = await getRepository();
  const id = Number(formData.get('id'));
  if (!Number.isFinite(id) || id <= 0) throw new Error('Invalid deck id');
  await repo.updateDeck(id, {
    title: String(formData.get('title') ?? '').trim() || undefined,
    subtitle: String(formData.get('subtitle') ?? '').trim() || null,
    jlptLevel: jlpt(formData.get('jlptLevel') as string | null),
    isPublished: formData.get('published') === 'on',
  });
  revalidatePath('/admin');
}

export async function togglePublishAction(formData: FormData): Promise<void> {
  await requireRole('admin', 'super_admin');
  const repo = await getRepository();
  const id = Number(formData.get('id'));
  const published = formData.get('published') === 'on';
  if (Number.isFinite(id) && id > 0) await repo.updateDeck(id, { isPublished: published });
  revalidatePath('/admin');
}

export async function setUserRoleAction(formData: FormData): Promise<void> {
  const current = await requireRole('super_admin');
  const repo = await getRepository();
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '') as Role;
  if (!userId || !['user', 'admin', 'super_admin'].includes(role)) return;
  if (userId === current.user.id && role !== 'super_admin') return;

  const target = await repo.getUserProfile(userId);
  if (!target || target.role === role) return;

  if (target.role === 'super_admin' && role !== 'super_admin') {
    const supers = (await repo.listUserProfiles()).filter((u) => u.role === 'super_admin').length;
    if (supers <= 1) return; // never drop the last super admin
  }

  await repo.setUserRole(userId, role);
  await repo.logRoleChange({ userId, byUserId: current.user.id, fromRole: target.role, toRole: role });
  revalidatePath('/admin/users');
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const current = await requireRole('super_admin');
  const repo = await getRepository();
  const userId = String(formData.get('userId') ?? '');
  if (!userId || userId === current.user.id) return;

  const target = await repo.getUserProfile(userId);
  if (!target) return;

  if (target.role === 'super_admin') {
    const supers = (await repo.listUserProfiles()).filter((u) => u.role === 'super_admin').length;
    if (supers <= 1) return; // never delete the last super admin
  }

  await repo.deleteUser(userId);
  revalidatePath('/admin/users');
}

export async function setConfigAction(formData: FormData): Promise<void> {
  await requireRole('super_admin');
  const repo = await getRepository();
  const config = await repo.getAppConfig();
  const dailyNewCap = Number(formData.get('dailyNewCap'));
  const desiredRetention = Number(formData.get('desiredRetention'));
  if (Number.isFinite(dailyNewCap) && dailyNewCap > 0) config.srs.dailyNewCap = Math.floor(dailyNewCap);
  if (Number.isFinite(desiredRetention) && desiredRetention > 0 && desiredRetention < 1) config.srs.desiredRetention = desiredRetention;
  await repo.setAppConfig(config);
  revalidatePath('/admin/settings');
}
