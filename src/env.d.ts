/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly TURSO_DB_URL: string;
  readonly TURSO_DB_AUTH_TOKEN: string;
}