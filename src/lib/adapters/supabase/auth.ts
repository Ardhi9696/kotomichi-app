/**
 * SupabaseAuthProvider — production auth (§3.1) via the Supabase JS client.
 * Wraps @supabase/ssr so session state lives in cookies, matching the
 * port contract consumed by Server Actions and the DAL.
 */

import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

import type {
  AuthProvider,
  AuthResult,
  AuthSession,
  AuthUser,
  SignUpInput,
} from '@/lib/ports/auth-port';

function needEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

async function getClient() {
  const cookieStore = await cookies();
  return createServerClient(
    needEnv('SUPABASE_URL'),
    needEnv('SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called in a Server Component context where cookie writes are
            // disallowed — Server Actions / Route Handlers handle the set.
          }
        },
      },
    },
  );
}

const toUser = (u: { id: string; email?: string | null } | null | undefined): AuthUser | null =>
  u ? { id: u.id, email: u.email ?? '' } : null;

const mapError = (e: { message?: string; code?: string } | null): string => {
  if (!e?.message) return 'Unknown auth error';
  const msg = e.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Invalid email or password';
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'This email is already registered';
  }
  if (msg.includes('password should be at least')) return 'Password is too short';
  if (msg.includes('rate limit')) return 'Too many attempts, please wait';
  if (msg.includes('email not confirmed') || msg.includes('email is not')) return 'Please confirm your email first';
  return e.message;
};

export class SupabaseAuthProvider implements AuthProvider {
  async getSession(): Promise<AuthSession> {
    const client = await getClient();
    const { data } = await client.auth.getUser();
    return { user: toUser(data.user) };
  }

  async signUp(input: SignUpInput): Promise<AuthResult<AuthUser>> {
    const client = await getClient();
    const { data, error } = await client.auth.signUp({
      email: input.email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) return { ok: false, error: mapError(error) };
    return { ok: true, data: toUser(data.user) ?? { id: '', email: input.email } };
  }

  async signIn(email: string, password: string): Promise<AuthResult<AuthUser>> {
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: mapError(error) };
    const user = toUser(data.user);
    if (!user) return { ok: false, error: 'Could not load your profile' };
    return { ok: true, data: user };
  }

  async signOut(): Promise<void> {
    const client = await getClient();
    await client.auth.signOut();
  }

  async sendPasswordReset(email: string): Promise<AuthResult> {
    const client = await getClient();
    const { error } = await client.auth.resetPasswordForEmail(email);
    if (error) return { ok: false, error: mapError(error) };
    return { ok: true };
  }

  async resetPassword(code: string, newPassword: string): Promise<AuthResult> {
    const client = await getClient();
    const { data, error } = await client.auth.verifyOtp({ type: 'recovery', token_hash: code });
    if (error) return { ok: false, error: mapError(error) };
    if (!data.session) return { ok: false, error: 'Session could not be established' };
    const { error: updateError } = await client.auth.updateUser({ password: newPassword });
    if (updateError) return { ok: false, error: mapError(updateError) };
    return { ok: true };
  }
}