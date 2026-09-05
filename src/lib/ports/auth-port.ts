/**
 * Auth port (§3.1). Everything auth-related flows through this contract;
 * concrete providers (Supabase, Clerk, NextAuth, mock...) implement it.
 */

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResult<T = void> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AuthProvider {
  getSession(): Promise<AuthSession>;
  signUp(input: SignUpInput): Promise<AuthResult<AuthUser>>;
  signIn(email: string, password: string): Promise<AuthResult<AuthUser>>;
  signOut(): Promise<void>;
  /** Request a password-reset email. Provider-specific email flow follows. */
  sendPasswordReset(email: string): Promise<AuthResult>;
  /** Redeem a reset OTP/code sent by the provider and set a new password. */
  resetPassword(code: string, newPassword: string): Promise<AuthResult>;
}