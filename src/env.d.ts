import type { Session } from '@auth/core/types';

/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="auth-astro/client" />
/// <reference types="@auth/core/types" />
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

// Extend Astro's session type
export interface ExtendedSession extends Session {
  user?: Session['user'] & {
    id: string;
  };
}

// Add session to Astro locals
declare namespace App {
  interface Locals {
    session: ExtendedSession | null;
  }
}
