'use server';

import { redirect } from 'next/navigation';

import { getAuthProvider, getRepository } from '@/lib/server/runtime';
import type { UserProfile } from '@/lib/domain';

export interface ActionState {
  error?: string;
}

export interface ForgotPasswordState extends ActionState {
  sent?: boolean;
}

export async function forgotPasswordAction(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) return { error: 'missingFields' };

  const auth = await getAuthProvider();
  const result = await auth.sendPasswordReset(email);
  if (!result.ok) return { error: result.error ?? 'unknownAuthError' };
  return { sent: true };
}

export async function resetPasswordAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const code = String(formData.get('code') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');
  if (!code) return { error: 'invalidResetCode' };
  if (password.length < 6) return { error: 'passwordTooShort' };
  if (password !== confirm) return { error: 'passwordMismatch' };

  const auth = await getAuthProvider();
  const result = await auth.resetPassword(code, password);
  if (!result.ok) return { error: result.error ?? 'unknownAuthError' };
  redirect('/login');
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { error: 'missing' };

  const auth = await getAuthProvider();
  const result = await auth.signIn(email, password);
  if (!result.ok) return { error: result.error ?? 'unknown' };
  redirect('/dashboard');
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const displayName = String(formData.get('displayName') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirm = String(formData.get('confirmPassword') ?? '');
  if (!displayName || !email || !password) return { error: 'missing' };
  if (password !== confirm) return { error: 'passwordMismatch' };

  const auth = await getAuthProvider();
  const result = await auth.signUp({ email, password, displayName });
  if (!result.ok) return { error: result.error ?? 'unknown' };
  if (!result.data) return { error: 'unknown' };

  const profile: UserProfile = {
    id: result.data.id,
    displayName,
    role: 'user',
    preferredLocale: 'en',
    level: 1,
    exp: 0,
    lastReviewDate: null,
    currentStreak: 0,
    longestStreak: 0,
    createdAt: new Date().toISOString(),
  };
  const repo = await getRepository();
  await repo.createUserProfile(profile);

  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  const auth = await getAuthProvider();
  await auth.signOut();
  redirect('/login');
}