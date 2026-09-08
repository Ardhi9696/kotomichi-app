/**
 * Runtime wiring (§3.1). Picks concrete adapters from the environment:
 *  - DATABASE_URL present  -> Postgres (Drizzle) repository
 *  - otherwise             -> in-memory repository seeded with demo data
 *  - SUPABASE_URL present  -> Supabase auth
 *  - otherwise             -> in-memory auth (demo accounts)
 */

import 'server-only';

import { cache } from 'react';

import type { AppConfig } from '@/lib/domain';
import type { AuthProvider } from '@/lib/ports/auth-port';
import type { VocabRepository } from '@/lib/ports/db-port';
import { PostgresVocabRepo } from '@/lib/adapters/postgres/vocab.repo';
import { InMemoryVocabRepo } from '@/lib/adapters/inmemory/vocab.repo';
import { DEMO_ADMIN, DEMO_LEARNER, InMemoryAuthProvider } from '@/lib/adapters/inmemory/auth';
import type { Role } from '@/lib/domain';

let repoPromise: Promise<VocabRepository> | null = null;
let authPromise: Promise<AuthProvider> | null = null;

const hasPostgres = () => Boolean(process.env.DATABASE_URL);
const hasSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

const DEMO_ROLES: Record<string, Role> = {
  [DEMO_ADMIN]: 'super_admin',
  [DEMO_LEARNER]: 'user',
};

async function seedMemberProfiles(mem: InMemoryVocabRepo): Promise<void> {
  const createdAt = new Date().toISOString();
  const names: Record<string, string> = {
    [DEMO_ADMIN]: 'Admin Demo',
    [DEMO_LEARNER]: 'Pembelajar Demo',
  };
  for (const [id, name] of Object.entries(names)) {
    if (await mem.getUserProfile(id)) continue;
    await mem.createUserProfile({
      id,
      displayName: name,
      role: DEMO_ROLES[id] ?? 'user',
      preferredLocale: 'id',
      theme: 'system',
      level: 1,
      exp: 0,
      lastReviewDate: null,
      currentStreak: 0,
      longestStreak: 0,
      createdAt,
    });
  }
}

export function getRepository(): Promise<VocabRepository> {
  if (!repoPromise) {
    repoPromise = (async () => {
      if (hasPostgres()) return new PostgresVocabRepo();
      const mem = new InMemoryVocabRepo();
      await seedMemberProfiles(mem);
      return mem;
    })();
  }
  return repoPromise;
}

export function getAuthProvider(): Promise<AuthProvider> {
  if (!authPromise) {
    authPromise = (async () => {
      if (hasSupabase()) {
        const { SupabaseAuthProvider } = await import('@/lib/adapters/supabase/auth');
        return new SupabaseAuthProvider();
      }
      return new InMemoryAuthProvider();
    })();
  }
  return authPromise;
}

/** True when running against the demo in-memory backend (dev without DB). */
export async function isDemoMode(): Promise<boolean> {
  return !hasPostgres();
}

/** Public self-signup gate (remote config boolean, toggled by a super admin). */
export function isSignupEnabled(): Promise<boolean> {
  return getAppConfigCached().then((c) => c.signup.enabled);
}

/** Public password-reset gate (remote config boolean, toggled by a super admin). */
export function isResetPasswordEnabled(): Promise<boolean> {
  return getAppConfigCached().then((c) => c.signup.resetPassword);
}

/** App config memoized once per request — multiple consumers share one read. */
export const getAppConfigCached = cache(async (): Promise<AppConfig> => {
  const repo = await getRepository();
  return repo.getAppConfig();
});