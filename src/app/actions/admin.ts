'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';
import type { JlptLevel, Role } from '@/lib/domain';

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

export async function createVocabularyAction(formData: FormData): Promise<void> {
  await requireRole('admin', 'super_admin');
  const repo = await getRepository();

  const hiragana = String(formData.get('hiragana') ?? '').trim();
  if (!hiragana) throw new Error('Hiragana is required');

  const romaji = String(formData.get('romaji') ?? '').trim() || null;
  const kanji = String(formData.get('kanji') ?? '').trim() || null;
  const partOfSpeech = String(formData.get('partOfSpeech') ?? '').trim() || null;
  const translations = parseTranslations(formData);

  await repo.createVocabulary(
    { kanji, hiragana, romaji, jlptLevel: jlpt(formData.get('jlptLevel') as string | null), partOfSpeech, translations },
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
  await requireRole('admin', 'super_admin');
  const repo = await getRepository();
  const userId = String(formData.get('userId') ?? '');
  const role = String(formData.get('role') ?? '') as Role;
  if (userId && ['user','admin','super_admin'].includes(role)) {
    await repo.setUserRole(userId, role);
  }
  revalidatePath('/admin');
}

export async function setConfigAction(formData: FormData): Promise<void> {
  await requireRole('admin', 'super_admin');
  const repo = await getRepository();
  const config = await repo.getAppConfig();
  const dailyNewCap = Number(formData.get('dailyNewCap'));
  const desiredRetention = Number(formData.get('desiredRetention'));
  if (Number.isFinite(dailyNewCap) && dailyNewCap > 0) config.srs.dailyNewCap = Math.floor(dailyNewCap);
  if (Number.isFinite(desiredRetention) && desiredRetention > 0 && desiredRetention < 1) config.srs.desiredRetention = desiredRetention;
  await repo.setAppConfig(config);
  revalidatePath('/admin');
}
