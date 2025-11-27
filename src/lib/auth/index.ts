/**
 * Authentication Service
 *
 * Exports the configured authentication service instance
 * Uses the IAuthService interface for pluggability
 */

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, AuthUsers, Sessions, Accounts, Verifications } from 'astro:db';
import {
  AUTH_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  FACEBOOK_CLIENT_ID,
  FACEBOOK_CLIENT_SECRET,
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
  MICROSOFT_TENANT_ID,
  APPLE_CLIENT_ID,
  APPLE_CLIENT_SECRET,
  AUTH_URL,
} from 'astro:env/server';
import { BetterAuthService } from './BetterAuthService';
import type { IAuthService } from './IAuthService';

/**
 * Better-auth configuration
 */
const authConfig = {
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: AuthUsers,
      session: Sessions,
      account: Accounts,
      verification: Verifications,
    },
  }),
  baseURL: AUTH_URL,
  secret: AUTH_SECRET,
  trustedOrigins: [
    AUTH_URL,
    'https://www.twokindsof.com',
    'https://twokindsof.com',
    'http://localhost:4321',
    'http://localhost:4322',
  ],
  socialProviders: {
    github: {
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
    },
    google: {
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
    },
    ...(FACEBOOK_CLIENT_ID &&
      FACEBOOK_CLIENT_SECRET && {
        facebook: {
          clientId: FACEBOOK_CLIENT_ID,
          clientSecret: FACEBOOK_CLIENT_SECRET,
        },
      }),
    ...(MICROSOFT_CLIENT_ID &&
      MICROSOFT_CLIENT_SECRET &&
      MICROSOFT_TENANT_ID && {
        microsoft: {
          clientId: MICROSOFT_CLIENT_ID,
          clientSecret: MICROSOFT_CLIENT_SECRET,
          tenantId: MICROSOFT_TENANT_ID,
        },
      }),
    ...(APPLE_CLIENT_ID &&
      APPLE_CLIENT_SECRET && {
        apple: {
          clientId: APPLE_CLIENT_ID,
          clientSecret: APPLE_CLIENT_SECRET,
        },
      }),
  },
  session: {
    expiresIn: 60 * 60, // 1 hour
    updateAge: 60 * 15, // 15 minutes
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
} as const;

/**
 * Better-auth instance (for direct API access if needed)
 */
export const auth = betterAuth(authConfig);

/**
 * Authentication service implementing IAuthService interface
 *
 * Use this for all authentication operations to maintain pluggability
 *
 * @example
 * // In middleware
 * const session = await authService.getSession({ headers: request.headers });
 *
 * @example
 * // In API routes
 * const result = await authService.signOut({ headers: request.headers });
 *
 * @example
 * // Check available providers
 * const providers = authService.getProviders();
 */
export const authService: IAuthService = new BetterAuthService(auth, authConfig);

/**
 * Helper function to get authentication service
 * Useful for dependency injection or testing
 */
export function getAuthService(): IAuthService {
  return authService;
}

/**
 * Create a custom auth service (for testing or alternative implementations)
 */
export function createAuthService(service: IAuthService): IAuthService {
  return service;
}

// Export types
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
export type { IAuthService, AuthSession, AuthUser } from './IAuthService';
