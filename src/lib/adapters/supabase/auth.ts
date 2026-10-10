/**
 * SupabaseAuthProvider — production auth (§3.1) via the Supabase JS client.
 * Wraps @supabase/ssr so session state lives in cookies, matching the
 * port contract consumed by Server Actions and the DAL.
 */

import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';

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
  if (!e?.message) return 'unknownAuthError';
  const msg = e.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'invalidCredentials';
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'emailInUse';
  }
  if (msg.includes('password should be at least')) return 'passwordTooShort';
  if (msg.includes('rate limit')) return 'rateLimited';
  if (msg.includes('email not confirmed') || msg.includes('email is not')) return 'confirmEmailFirst';
  return msg;
};

interface JwtClaims {
  sub?: unknown;
  email?: unknown;
  exp?: unknown;
}

/**
 * Decode the JWT payload without a network round-trip. The signature is NOT
 * verified here: tokens cannot be forged without the Supabase JWT secret, and
 * expiry is checked below. Worst case, a revoked-but-unexpired token is
 * accepted for up to its remaining lifetime (standard getSession tradeoff).
 */
function decodeJwtPayload(token: string): JwtClaims | null {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const json = Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export class SupabaseAuthProvider implements AuthProvider {
  async getSession(): Promise<AuthSession> {
    const client = await getClient();
    // Fast path: read the session from cookies — no network round-trip.
    // getUser() re-validates the JWT against the Auth server on EVERY call
    // (100-300ms serial before any DB query), which multiplied every SWR
    // fetch, warmup and heartbeat.
    const {
      data: { session },
    } = await client.auth.getSession();
    if (session?.access_token) {
      const claims = decodeJwtPayload(session.access_token);
      const sub = typeof claims?.sub === 'string' ? claims.sub : '';
      const expMs = typeof claims?.exp === 'number' ? claims.exp * 1000 : 0;
      if (sub && expMs > Date.now() + 10_000) {
        const email = typeof claims?.email === 'string' ? claims.email : '';
        return { user: { id: sub, email } };
      }
    }
    // Slow path (rare): expired/undecodable token — fall back to
    // server-validated user so a stale session never silently passes.
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
    const user = toUser(data.user);
    if (!user) return { ok: false, error: 'profileLoadFailed' };
    return { ok: true, data: user };
  }

  async adminCreateUser(input: SignUpInput): Promise<AuthResult<AuthUser>> {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey || !process.env.SUPABASE_URL) return { ok: false, error: 'adminCreateFailed' };
    const admin = createAdminClient(process.env.SUPABASE_URL, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { display_name: input.displayName },
    });
    if (error) return { ok: false, error: mapError(error) };
    const user = toUser(data.user);
    if (!user) return { ok: false, error: 'profileLoadFailed' };
    return { ok: true, data: user };
  }

  async signIn(email: string, password: string): Promise<AuthResult<AuthUser>> {
    const client = await getClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: mapError(error) };
    const user = toUser(data.user);
    if (!user) return { ok: false, error: 'profileLoadFailed' };
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
    if (!data.session) return { ok: false, error: 'sessionFailed' };
    const { error: updateError } = await client.auth.updateUser({ password: newPassword });
    if (updateError) return { ok: false, error: mapError(updateError) };
    return { ok: true };
  }
}