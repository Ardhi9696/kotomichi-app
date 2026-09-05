/**
 * InMemoryAuthProvider — dev-only auth (§3.1). Lets the app run without
 * Supabase: demo accounts are seeded on construction and signed in via
 * Server Actions just like the real provider.
 */

import 'server-only';

import type {
  AuthProvider,
  AuthResult,
  AuthSession,
  AuthUser,
  SignUpInput,
} from '@/lib/ports/auth-port';

interface MemAccount {
  id: string;
  email: string;
  password: string;
  displayName: string;
}

export const DEMO_ADMIN = '00000000-0000-0000-0000-000000000001';
export const DEMO_LEARNER = '00000000-0000-0000-0000-000000000002';

const DEMO_ACCOUNTS: readonly MemAccount[] = [
  { id: DEMO_ADMIN, email: 'admin@kotomichi.app', password: 'demo-admin', displayName: 'Admin Demo' },
  { id: DEMO_LEARNER, email: 'demo@kotomichi.app', password: 'demo', displayName: 'Pembelajar Demo' },
];

export class InMemoryAuthProvider implements AuthProvider {
  private accounts = new Map<string, MemAccount>();
  private current: AuthUser | null = null;

  constructor() {
    for (const a of DEMO_ACCOUNTS) this.accounts.set(a.email.toLowerCase(), a);
  }

  private toUser(a: MemAccount): AuthUser {
    return { id: a.id, email: a.email };
  }

  async getSession(): Promise<AuthSession> {
    return { user: this.current ? { ...this.current } : null };
  }

  async signUp(input: SignUpInput): Promise<AuthResult<AuthUser>> {
    const email = input.email.toLowerCase().trim();
    if (this.accounts.has(email)) return { ok: false, error: 'Email already registered' };
    if (input.password.length < 6) return { ok: false, error: 'Password too short (min 6)' };
    const account: MemAccount = {
      id: crypto.randomUUID(),
      email,
      password: input.password,
      displayName: input.displayName,
    };
    this.accounts.set(email, account);
    const user = this.toUser(account);
    return { ok: true, data: user };
  }

  async signIn(email: string, password: string): Promise<AuthResult<AuthUser>> {
    const a = this.accounts.get(email.toLowerCase().trim());
    if (!a || a.password !== password) return { ok: false, error: 'Invalid email or password' };
    this.current = this.toUser(a);
    return { ok: true, data: this.current };
  }

  async signOut(): Promise<void> {
    this.current = null;
  }

  async sendPasswordReset(email: string): Promise<AuthResult> {
    void email;
    return { ok: true };
  }

  async resetPassword(code: string, newPassword: string): Promise<AuthResult> {
    void code;
    void newPassword;
    return { ok: true };
  }
}