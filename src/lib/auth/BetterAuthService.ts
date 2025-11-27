/**
 * Better Auth implementation of IAuthService
 *
 * Wraps better-auth to conform to the IAuthService interface
 */

import type { BetterAuthOptions } from 'better-auth';
import type {
  IAuthService,
  AuthSession,
  AuthUser,
  GetSessionOptions,
  SignOutOptions,
  SignOutResult,
  OAuthProvider,
} from './IAuthService';

/**
 * Better Auth Service implementation
 */
export class BetterAuthService implements IAuthService {
  private auth: ReturnType<typeof import('better-auth').betterAuth>;
  private config: BetterAuthOptions;

  constructor(
    authInstance: ReturnType<typeof import('better-auth').betterAuth>,
    config: BetterAuthOptions
  ) {
    this.auth = authInstance;
    this.config = config;
  }

  async getSession(options: GetSessionOptions): Promise<AuthSession | null> {
    try {
      const session = await this.auth.api.getSession({ headers: options.headers });

      if (!session || !session.user) {
        return null;
      }

      return this.mapToAuthSession(session);
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async signOut(options: SignOutOptions): Promise<SignOutResult> {
    try {
      await this.auth.api.signOut({ headers: options.headers });

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
      };
    }
  }

  getProviders(): OAuthProvider[] {
    const providers: OAuthProvider[] = [];
    const socialProviders = this.config.socialProviders || {};

    // Map better-auth provider config to our interface
    const providerMap: Record<string, string> = {
      github: 'GitHub',
      google: 'Google',
      facebook: 'Facebook',
      microsoft: 'Microsoft',
      apple: 'Apple',
      discord: 'Discord',
      twitter: 'Twitter',
      linkedin: 'LinkedIn',
    };

    for (const [id, name] of Object.entries(providerMap)) {
      if (socialProviders[id as keyof typeof socialProviders]) {
        providers.push({
          id,
          name,
          enabled: true,
        });
      }
    }

    return providers;
  }

  isProviderEnabled(providerId: string): boolean {
    const socialProviders = this.config.socialProviders || {};
    return !!socialProviders[providerId as keyof typeof socialProviders];
  }

  getSignInUrl(providerId: string, callbackUrl?: string): string {
    const baseUrl = this.config.baseURL || '';
    let url = `${baseUrl}/api/auth/signin/${providerId}`;

    if (callbackUrl) {
      url += `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }

    return url;
  }

  async hasRole(session: AuthSession | null, _role: string): Promise<boolean> {
    if (!session) return false;

    // Better-auth doesn't have built-in roles by default
    // This would need to be implemented via database queries
    // For now, return false - override this in your app if needed
    return false;
  }

  async hasPermission(session: AuthSession | null, _permission: string): Promise<boolean> {
    if (!session) return false;

    // Better-auth doesn't have built-in permissions by default
    // This would need to be implemented via database queries
    // For now, return false - override this in your app if needed
    return false;
  }

  /**
   * Map better-auth session to our AuthSession interface
   */
  private mapToAuthSession(betterAuthSession: {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      emailVerified?: boolean;
    };
    session?: {
      id?: string;
      expiresAt?: Date;
    };
  }): AuthSession {
    const user: AuthUser = {
      id: betterAuthSession.user.id,
      email: betterAuthSession.user.email,
      name: betterAuthSession.user.name,
      image: betterAuthSession.user.image,
      emailVerified: betterAuthSession.user.emailVerified,
    };

    return {
      user,
      sessionId: betterAuthSession.session?.id,
      expiresAt: betterAuthSession.session?.expiresAt,
    };
  }
}
