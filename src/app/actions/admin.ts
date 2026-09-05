'use server';

import { revalidatePath } from 'next/cache';

import { requireRole } from '@/lib/server/dal';
import { getAuthProvider, getRepository } from '@/lib/server/runtime';
import type { JlptLevel, Role, UserProfile } from '@/lib/domain';
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
  // The app runs with exactly one super admin (§ single-super-admin): role
  // edits may only move users between 'user' and 'admin'.
  if (!userId || !['user', 'admin'].includes(role)) return;
  if (userId === current.user.id) return;

  const target = await repo.getUserProfile(userId);
  if (!target || target.role === role || target.role === 'super_admin') return;

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
  if (!target || target.role === 'super_admin') return;

  await repo.deleteUser(userId);
  revalidatePath('/admin/users');
}

export type CreateUserState = { error?: string; ok?: boolean };

export async function createUserAction(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  await requireRole('super_admin');
  const displayName = String(formData.get('displayName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const role = String(formData.get('role') ?? '') as Role;
  if (!displayName || !email || !password) return { error: 'missingFields' };
  if (password.length < 6) return { error: 'passwordTooShort' };
  // exactly one super admin exists — new accounts may only be admin or user
  if (!['user', 'admin'].includes(role)) return { error: 'invalidRole' };

  const auth = await getAuthProvider();
  const result = await auth.adminCreateUser({ email, password, displayName });
  if (!result.ok || !result.data) return { error: result.error ?? 'adminCreateFailed' };

  const profile: UserProfile = {
    id: result.data.id,
    displayName,
    role,
    preferredLocale: 'en',
    theme: 'system',
    level: 1,
    exp: 0,
    lastReviewDate: null,
    currentStreak: 0,
    longestStreak: 0,
    createdAt: new Date().toISOString(),
  };
  const repo = await getRepository();
  await repo.createUserProfile(profile);

  revalidatePath('/admin/users');
  return { ok: true };
}

export type RenameUserState = { error?: string; ok?: boolean };

export async function renameUserAction(_prev: RenameUserState, formData: FormData): Promise<RenameUserState> {
  await requireRole('super_admin');
  const userId = String(formData.get('userId') ?? '');
  const displayName = String(formData.get('displayName') ?? '').trim();
  if (!userId || !displayName) return { error: 'missingFields' };
  const repo = await getRepository();
  await repo.updateUserProfile(userId, { displayName });
  revalidatePath('/admin/users');
  return { ok: true };
}

export type ConfigSaveState = { error?: string; ok?: boolean };

export async function setConfigAction(_prev: ConfigSaveState, formData: FormData): Promise<ConfigSaveState> {
  await requireRole('super_admin');
  const repo = await getRepository();
  const config = await repo.getAppConfig();
  const dailyNewCap = Number(formData.get('dailyNewCap'));
  const desiredRetention = Number(formData.get('desiredRetention'));
  if (!Number.isFinite(dailyNewCap) || dailyNewCap <= 0) return { error: 'invalidDailyNewCap' };
  if (!Number.isFinite(desiredRetention) || desiredRetention <= 0 || desiredRetention >= 1) {
    return { error: 'invalidDesiredRetention' };
  }
  config.srs.dailyNewCap = Math.floor(dailyNewCap);
  config.srs.desiredRetention = desiredRetention;
  config.signup.enabled = formData.get('signupEnabled') === 'on';
  config.signup.resetPassword = formData.get('resetPasswordEnabled') === 'on';
  await repo.setAppConfig(config);
  revalidatePath('/admin/settings');
  return { ok: true };
}
