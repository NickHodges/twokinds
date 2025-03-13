/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="auth-astro/client" />
/// <reference types="@auth/core/types" />

interface ImportMetaEnv {
  readonly TURSO_DB_URL: string;
  readonly TURSO_DB_AUTH_TOKEN: string;
  readonly ASTRO_DATABASE_FILE: string;
}

declare namespace App {
  interface Locals {
    session: import('@auth/core/types').Session | null;
  }
}
