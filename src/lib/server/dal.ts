/**
 * DAL — the server-facing data access layer. Wraps the runtime adapters
 * (repo + auth) behind request-scoped helpers and enforces the two-layer
 * auth model (§4.6): the *application* checks the profile role here; the
 * *database* enforces RLS policies on every query.
 */

import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { getRepository } from '@/lib/server/runtime';
import { StudyService } from '@/lib/srs/study-service';
import type { AppConfig, DirectionThreshold, Role, UserProfile } from '@/lib/domain';
import type { VocabRepository } from '@/lib/ports/db-port';
import { getAuthProvider } from '@/lib/server/runtime';

export interface SessionUser {
  id: string;
  email: string;
}

async function sessionUserInternal(): Promise<SessionUser | null> {
  const auth = await getAuthProvider();
  const session = await auth.getSession();
  return session.user;
}

/** Authenticated user from the active session (no DB access). */
export const getSessionUser = cache(sessionUserInternal);

function ensureProfile(authUser: SessionUser): Promise<UserProfile> {
  return getRepository().then(async (repo) => {
    const existing = await repo.getUserProfile(authUser.id);
    if (existing) return existing;
    const created: UserProfile = {
      id: authUser.id,
      displayName: authUser.email.split('@')[0] ?? 'Learner',
      role: 'user',
      preferredLocale: 'en',
      theme: 'system',
      level: 1,
      exp: 0,
      lastReviewDate: null,
      currentStreak: 0,
      longestStreak: 0,
      createdAt: new Date().toISOString(),
    };
    await repo.createUserProfile(created);
    return created;
  });
}

export interface CurrentUser {
  user: SessionUser;
  profile: UserProfile;
}

/** Authenticated user or null — for pages that can render signed-out. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  return { user, profile: await ensureProfile(user) };
});

/** Redirects to /login when signed out. */
export async function requireUser(): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect('/login');
  return current;
}

/** Redirects to / when the profile role is not allowed. */
export async function requireRole(...roles: Role[]): Promise<CurrentUser> {
  const current = await requireUser();
  if (!roles.includes(current.profile.role)) redirect('/');
  return current;
}

/**
 * Guards learner-only pages. Learners (`user`) pass through; staff
 * (`admin`/`super_admin`) are sent to /dashboard since management roles do
 * not study.
 */
export async function requireLearner(): Promise<CurrentUser> {
  const current = await requireUser();
  if (current.profile.role !== 'user') redirect('/dashboard');
  return current;
}

export interface StudyContext {
  user: SessionUser;
  profile: UserProfile;
  repo: VocabRepository;
  config: AppConfig;
  thresholds: Record<DirectionThreshold['direction'], DirectionThreshold>;
  service: StudyService;
}

async function studyContextInternal(): Promise<StudyContext> {
  const { user, profile } = await requireUser();
  const repo = await getRepository();
  const [config, thresholds] = await Promise.all([repo.getAppConfig(), repo.getDirectionThresholds()]);
  return { user, profile, repo, config, thresholds, service: new StudyService(repo, config, thresholds) };
}

/** Full read-oriented context for a request (memoized per request). */
export const getStudyContext = cache(studyContextInternal);