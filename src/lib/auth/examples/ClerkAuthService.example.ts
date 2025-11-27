/**
 * Example: Clerk Auth Service Implementation
 *
 * Shows how to implement IAuthService for Clerk authentication
 * Clerk is a popular authentication service with built-in UI components
 *
 * To use this:
 * 1. npm install @clerk/astro
 * 2. Configure Clerk in your app
 * 3. Replace BetterAuthService with ClerkAuthService
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

interface ClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string | null;
}

interface ClerkSession {
  userId: string;
  user: ClerkUser;
}

/**
 * Clerk authentication service implementation
 */
export class ClerkAuthService implements IAuthService {
  private clerkClient: {
    sessions: {
      getSession(sessionId: string): Promise<ClerkSession>;
    };
  };

  constructor(clerkClient: ClerkAuthService['clerkClient']) {
    this.clerkClient = clerkClient;
  }

  async getSession(options: GetSessionOptions): Promise<AuthSession | null> {
    try {
      // Extract session token from cookies
      const sessionToken = this.extractSessionToken(options.headers);
      if (!sessionToken) return null;

      // Get session from Clerk
      const clerkSession = await this.clerkClient.sessions.getSession(sessionToken);
      if (!clerkSession?.user) return null;

      return this.mapToAuthSession(clerkSession);
    } catch (error) {
      console.error('Error getting Clerk session:', error);
      return null;
    }
  }

  async signOut(_options: SignOutOptions): Promise<SignOutResult> {
    // Clerk handles sign-out via their SDK
    // This would typically redirect to Clerk's sign-out endpoint
    return {
      success: true,
    };
  }

  getProviders(): OAuthProvider[] {
    // Clerk supports many providers, return configured ones
    return [
      { id: 'google', name: 'Google', enabled: true },
      { id: 'github', name: 'GitHub', enabled: true },
      { id: 'microsoft', name: 'Microsoft', enabled: true },
    ];
  }

  isProviderEnabled(providerId: string): boolean {
    const providers = this.getProviders();
    return providers.some((p) => p.id === providerId);
  }

  getSignInUrl(providerId: string, callbackUrl?: string): string {
    let url = `/sign-in?provider=${providerId}`;
    if (callbackUrl) {
      url += `&redirect_url=${encodeURIComponent(callbackUrl)}`;
    }
    return url;
  }

  async hasRole(session: AuthSession | null, _role: string): Promise<boolean> {
    if (!session) return false;

    // Clerk has built-in role support via publicMetadata
    // This is a simplified example
    try {
      // In real implementation, you'd query Clerk's API
      // const user = await clerkClient.users.getUser(session.user.id);
      // return user.publicMetadata?.role === role;
      return false;
    } catch {
      return false;
    }
  }

  async hasPermission(session: AuthSession | null, _permission: string): Promise<boolean> {
    if (!session) return false;

    // Clerk supports permissions via organizations
    // This is a simplified example
    return false;
  }

  private extractSessionToken(headers: Headers): string | null {
    const cookie = headers.get('cookie');
    if (!cookie) return null;

    const match = cookie.match(/__session=([^;]+)/);
    return match ? match[1] : null;
  }

  private mapToAuthSession(clerkSession: ClerkSession): AuthSession {
    const user: AuthUser = {
      id: clerkSession.userId,
      email: clerkSession.user.emailAddresses[0]?.emailAddress || '',
      name:
        `${clerkSession.user.firstName || ''} ${clerkSession.user.lastName || ''}`.trim() || null,
      image: clerkSession.user.imageUrl,
    };

    return {
      user,
    };
  }
}

/**
 * Example usage:
 *
 * import { ClerkAuthService } from '@/lib/auth/examples/ClerkAuthService.example';
 * import { createClerkClient } from '@clerk/astro/server';
 *
 * const clerkClient = createClerkClient({
 *   secretKey: import.meta.env.CLERK_SECRET_KEY,
 * });
 *
 * export const authService = new ClerkAuthService(clerkClient);
 *
 * // Use in middleware
 * const session = await authService.getSession({ headers: request.headers });
 */
