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

export const auth = betterAuth({
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
});

export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
