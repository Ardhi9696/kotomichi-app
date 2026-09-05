'use server';

import { revalidatePath } from 'next/cache';

import { requireUser } from '@/lib/server/dal';
import { getRepository } from '@/lib/server/runtime';
import type { ThemeMode } from '@/lib/domain';

export type SettingsState = { error?: string; ok?: boolean };

const LOCALES = new Set(['en', 'id']);
const THEMES = new Set<ThemeMode>(['light', 'dark', 'system']);

export async function updateSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const { profile } = await requireUser();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const preferredLocale = String(formData.get('language') ?? '');
  const theme = String(formData.get('theme') ?? '') as ThemeMode;

  if (!displayName) return { error: 'missingFields' };
  if (!LOCALES.has(preferredLocale)) return { error: 'invalidLocale' };
  if (!THEMES.has(theme)) return { error: 'invalidTheme' };

  const repo = await getRepository();
  await repo.updateUserProfile(profile.id, { displayName, preferredLocale, theme });

  revalidatePath('/dashboard', 'layout');
  return { ok: true };
}