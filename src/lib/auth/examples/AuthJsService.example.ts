/**
 * Example: Auth.js (NextAuth) Service Implementation
 *
 * Shows how to implement IAuthService for Auth.js authentication
 * Auth.js is a popular authentication library (formerly NextAuth)
 *
 * To use this:
 * 1. npm install auth-astro @auth/core
 * 2. Configure Auth.js in your app
 * 3. Replace BetterAuthService with AuthJsService
 */

import type {
  IAuthService,
  AuthSession,
  AuthUser,
  GetSessionOptions,
  SignOutOptions,
  SignOutResult,
  OAuthProvider,
} from '../IAuthService';

interface AuthJsSession {
  user: {
    id?: string;
    email?: string;
    name?: string | null;
    image?: string | null;
  };
  expires: string;
}

interface AuthJsConfig {
  providers: Array<{
    id: string;
    name: string;
  }>;
  callbacks?: {
    session?: (params: { session: AuthJsSession; token: unknown }) => Promise<AuthJsSession>;
  };
}

/**
 * Auth.js authentication service implementation
 */
export class AuthJsService implements IAuthService {
  private getServerSession: (options: { headers: Headers }) => Promise<AuthJsSession | null>;
  private config: AuthJsConfig;

  constructor(getServerSession: AuthJsService['getServerSession'], config: AuthJsConfig) {
    this.getServerSession = getServerSession;
    this.config = config;
  }

  async getSession(options: GetSessionOptions): Promise<AuthSession | null> {
    try {
      const session = await this.getServerSession({ headers: options.headers });

      if (!session?.user?.email) {
        return null;
      }

      return this.mapToAuthSession(session);
    } catch (error) {
      console.error('Error getting Auth.js session:', error);
      return null;
    }
  }

  async signOut(_options: SignOutOptions): Promise<SignOutResult> {
    // Auth.js handles sign-out via their API
    return {
      success: true,
    };
  }

  getProviders(): OAuthProvider[] {
    return this.config.providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      enabled: true,
    }));
  }

  isProviderEnabled(providerId: string): boolean {
    return this.config.providers.some((p) => p.id === providerId);
  }

  getSignInUrl(providerId: string, callbackUrl?: string): string {
    let url = `/api/auth/signin/${providerId}`;
    if (callbackUrl) {
      url += `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    return url;
  }

  async hasRole(session: AuthSession | null, _role: string): Promise<boolean> {
    if (!session) return false;

    // Auth.js doesn't have built-in roles
    // You'd implement this via database queries or JWT claims
    return false;
  }

  async hasPermission(session: AuthSession | null, _permission: string): Promise<boolean> {
    if (!session) return false;

    // Auth.js doesn't have built-in permissions
    // You'd implement this via database queries or JWT claims
    return false;
  }

  private mapToAuthSession(authJsSession: AuthJsSession): AuthSession {
    const user: AuthUser = {
      id: authJsSession.user.id || '',
      email: authJsSession.user.email || '',
      name: authJsSession.user.name,
      image: authJsSession.user.image,
    };

    return {
      user,
      expiresAt: new Date(authJsSession.expires),
    };
  }
}

/**
 * Example usage:
 *
 * import { AuthJsService } from '@/lib/auth/examples/AuthJsService.example';
 * import { getServerSession } from 'auth-astro/server';
 * import GitHub from '@auth/core/providers/github';
 * import Google from '@auth/core/providers/google';
 *
 * const authConfig = {
 *   providers: [
 *     GitHub({
 *       clientId: import.meta.env.GITHUB_CLIENT_ID,
 *       clientSecret: import.meta.env.GITHUB_CLIENT_SECRET,
 *     }),
 *     Google({
 *       clientId: import.meta.env.GOOGLE_CLIENT_ID,
 *       clientSecret: import.meta.env.GOOGLE_CLIENT_SECRET,
 *     }),
 *   ],
 * };
 *
 * export const authService = new AuthJsService(
 *   async (options) => getServerSession(options.headers, authConfig),
 *   authConfig
 * );
 *
 * // Use in middleware
 * const session = await authService.getSession({ headers: request.headers });
 */
