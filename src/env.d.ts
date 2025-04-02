import type { Session } from '@auth/core/types';

/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="auth-astro/client" />
/// <reference path="./types/astro.d.ts" />

interface ImportMetaEnv {
  // Database URLs

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

  // Public Variables (accessible in client-side code)
  readonly PUBLIC_SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Extend Astro's session type
export interface ExtendedSession extends Session {
  user?: Session['user'] & {
    id: number;
  };
}

// Add session to Astro locals
declare namespace App {
  interface Locals {
    session: Session | null;
  }
}

// -- Module Augmentation for Auth.js Types --
declare module '@auth/core/types' {
  /**
   * Extend the built-in session types
   */
  interface Session {
    user?: {
      id: number;
      role?: string;
    } & Session['user'];
  }

  /**
   * Extend the built-in user types
   * This might be needed if the `user` object passed to callbacks needs the role.
   */
  interface User {
    role?: string;
  }
}

declare module '@auth/core/jwt' {
  /**
   * Extend the built-in JWT types
   */
  interface JWT {
    id?: number;
    role?: string;
    name?: string | null;
    email?: string | null;
    picture?: string | null;
  }
}
