import type { Session, User } from './lib/auth';

/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference path="./types/astro.d.ts" />

interface ImportMetaEnv {
  // Database URLs
  readonly ASTRO_DATABASE_FILE: string;
  readonly ASTRO_DB_REMOTE_URL: string;
  readonly ASTRO_DB_APP_TOKEN: string;

  // Auth Configuration
  readonly AUTH_SECRET: string;
  readonly AUTH_TRUST_HOST: boolean;
  readonly NEXTAUTH_URL: string;
  readonly AUTH_URL: string;

  // OAuth Provider Credentials
  readonly GITHUB_CLIENT_ID: string;
  readonly GITHUB_CLIENT_SECRET: string;
  readonly GOOGLE_CLIENT_ID: string;
  readonly GOOGLE_CLIENT_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Better Auth session type - includes both session and user
export interface ExtendedSession {
  session: Session;
  user: User;
}
