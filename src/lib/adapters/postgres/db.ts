/**
 * Drizzle + Postgres client.
 *
 * Uses the standard `postgres` driver with a plain connection string so the
 * app is portable across Postgres providers (Supabase, Neon, RDS...).
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

import * as schema from '@/lib/db/schema';

let orm: ReturnType<typeof drizzle> | null = null;

function sslMode(url: string): boolean | 'require' | undefined {
  if (url.includes('sslmode=require')) return 'require';
  if (url.includes('sslmode=disable')) return false;
  if (url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1')) return false;
  return 'require';
}

export function needsDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'DATABASE_URL is not set. Configure .env.local (see .env.example), ' +
        'or run without it to use the local in-memory adapter (dev only).',
    );
  }
}

export function getDb(): ReturnType<typeof drizzle> {
  needsDb();
  if (!orm) {
    const client = postgres(process.env.DATABASE_URL as string, {
      max: 8,
      prepare: false,
      ssl: sslMode(process.env.DATABASE_URL as string),
      onnotice: () => {},
    });
    orm = drizzle(client, { schema });
  }
  return orm;
}