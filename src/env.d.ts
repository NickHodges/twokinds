import type { User } from '@auth/core/types';
import type { Users } from 'astro:db';

/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="auth-astro/client" />
/// <reference types="@auth/core/types" />
/// <reference path="./types/astro.d.ts" />

interface ImportMetaEnv {
  readonly TURSO_DB_AUTH_TOKEN: string;
  readonly ASTRO_DATABASE_FILE: string;
}

// Define proper types for session extensions
interface ExtendedUser extends User {
  sub?: string;
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface ExtendedSession {
  user?: ExtendedUser;
  sub?: string;
  userId?: string;
  account?: {
    provider?: string;
  };
  expires?: string;
}

// Add client directive types
declare module 'astro:db' {
  interface Tables {
    users: Users;
  }
}
