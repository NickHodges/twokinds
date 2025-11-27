/**
 * Mock Authentication Service
 *
 * A fake authentication service for testing and development
 * Useful for unit tests and local development without real OAuth setup
 */

import type {
  IAuthService,
  AuthSession,
  AuthUser,
  GetSessionOptions,
  SignOutOptions,
  SignOutResult,
  OAuthProvider,
} from './IAuthService';

export interface MockAuthConfig {
  /**
   * Whether the mock user should be authenticated by default
   */
  authenticated?: boolean;

  /**
   * Mock user to return in sessions
   */
  mockUser?: Partial<AuthUser>;

  /**
   * Mock roles for the user
   */
  roles?: string[];

  /**
   * Mock permissions for the user
   */
  permissions?: string[];

  /**
   * Available OAuth providers
   */
  providers?: OAuthProvider[];
}

/**
 * Mock authentication service for testing
 */
export class MockAuthService implements IAuthService {
  private config: Required<MockAuthConfig>;
  private signedOut = false;

  constructor(config: MockAuthConfig = {}) {
    this.config = {
      authenticated: config.authenticated ?? true,
      mockUser: config.mockUser ?? {},
      roles: config.roles ?? [],
      permissions: config.permissions ?? [],
      providers: config.providers ?? [
        { id: 'google', name: 'Google', enabled: true },
        { id: 'github', name: 'GitHub', enabled: true },
      ],
    };
  }

  async getSession(_options: GetSessionOptions): Promise<AuthSession | null> {
    if (!this.config.authenticated || this.signedOut) {
      return null;
    }

    const user: AuthUser = {
      id: this.config.mockUser.id ?? 'mock-user-123',
      email: this.config.mockUser.email ?? 'test@example.com',
      name: this.config.mockUser.name ?? 'Test User',
      image: this.config.mockUser.image ?? 'https://via.placeholder.com/150',
      emailVerified: this.config.mockUser.emailVerified ?? true,
    };

    return {
      user,
      sessionId: 'mock-session-123',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    };
  }

  async signOut(_options: SignOutOptions): Promise<SignOutResult> {
    this.signedOut = true;
    return {
      success: true,
    };
  }

  getProviders(): OAuthProvider[] {
    return this.config.providers;
  }

  isProviderEnabled(providerId: string): boolean {
    return this.config.providers.some((p) => p.id === providerId && p.enabled);
  }

  getSignInUrl(providerId: string, callbackUrl?: string): string {
    let url = `/mock/signin/${providerId}`;
    if (callbackUrl) {
      url += `?callbackUrl=${encodeURIComponent(callbackUrl)}`;
    }
    return url;
  }

  async hasRole(_session: AuthSession | null, role: string): Promise<boolean> {
    return this.config.roles.includes(role);
  }

  async hasPermission(_session: AuthSession | null, permission: string): Promise<boolean> {
    return this.config.permissions.includes(permission);
  }

  /**
   * Reset the mock state (useful between tests)
   */
  reset(): void {
    this.signedOut = false;
  }

  /**
   * Set authenticated state
   */
  setAuthenticated(authenticated: boolean): void {
    this.config.authenticated = authenticated;
    this.signedOut = !authenticated;
  }

  /**
   * Set mock user
   */
  setMockUser(user: Partial<AuthUser>): void {
    this.config.mockUser = user;
  }

  /**
   * Add a role
   */
  addRole(role: string): void {
    if (!this.config.roles.includes(role)) {
      this.config.roles.push(role);
    }
  }

  /**
   * Add a permission
   */
  addPermission(permission: string): void {
    if (!this.config.permissions.includes(permission)) {
      this.config.permissions.push(permission);
    }
  }
}

/**
 * Create a mock auth service with admin privileges
 */
export function createMockAdminAuth(): MockAuthService {
  return new MockAuthService({
    authenticated: true,
    mockUser: {
      id: 'admin-123',
      email: 'admin@example.com',
      name: 'Admin User',
    },
    roles: ['admin', 'user'],
    permissions: ['*'], // All permissions
  });
}

/**
 * Create a mock auth service with regular user privileges
 */
export function createMockUserAuth(): MockAuthService {
  return new MockAuthService({
    authenticated: true,
    mockUser: {
      id: 'user-123',
      email: 'user@example.com',
      name: 'Regular User',
    },
    roles: ['user'],
    permissions: ['read:sayings', 'create:sayings'],
  });
}

/**
 * Create a mock auth service with no authentication
 */
export function createMockGuestAuth(): MockAuthService {
  return new MockAuthService({
    authenticated: false,
  });
}
