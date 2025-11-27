/**
 * Authentication Service Interface
 *
 * Defines the contract for authentication services in the application.
 * This allows pluggable authentication implementations (better-auth, Auth.js, Clerk, etc.)
 */

/**
 * User information from the authentication provider
 */
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

/**
 * Session information including user and metadata
 */
export interface AuthSession {
  user: AuthUser;
  sessionId?: string;
  expiresAt?: Date;
}

/**
 * Options for getting a session
 */
export interface GetSessionOptions {
  headers: Headers;
}

/**
 * Options for signing out
 */
export interface SignOutOptions {
  headers: Headers;
}

/**
 * Result of a sign-in operation
 */
export interface SignInResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
  redirectUrl?: string;
}

/**
 * Result of a sign-out operation
 */
export interface SignOutResult {
  success: boolean;
  error?: string;
}

/**
 * OAuth provider configuration
 */
export interface OAuthProvider {
  id: string;
  name: string;
  enabled: boolean;
}

/**
 * Authentication service interface
 *
 * Implement this interface to create custom authentication providers
 */
export interface IAuthService {
  /**
   * Get the current session from request headers
   *
   * @param options Options including request headers
   * @returns Session if authenticated, null otherwise
   *
   * @example
   * const session = await authService.getSession({ headers: request.headers });
   * if (session) {
   *   console.log('User:', session.user.email);
   * }
   */
  getSession(options: GetSessionOptions): Promise<AuthSession | null>;

  /**
   * Sign out the current user
   *
   * @param options Options including request headers
   * @returns Result of sign-out operation
   *
   * @example
   * const result = await authService.signOut({ headers: request.headers });
   * if (result.success) {
   *   return redirect('/');
   * }
   */
  signOut(options: SignOutOptions): Promise<SignOutResult>;

  /**
   * Get list of available OAuth providers
   *
   * @returns List of configured OAuth providers
   *
   * @example
   * const providers = authService.getProviders();
   * // [{ id: 'google', name: 'Google', enabled: true }, ...]
   */
  getProviders(): OAuthProvider[];

  /**
   * Check if a specific provider is enabled
   *
   * @param providerId The provider ID (e.g., 'google', 'github')
   * @returns True if provider is configured and enabled
   *
   * @example
   * if (authService.isProviderEnabled('github')) {
   *   // Show GitHub sign-in button
   * }
   */
  isProviderEnabled(providerId: string): boolean;

  /**
   * Get the sign-in URL for a specific provider
   *
   * @param providerId The provider ID
   * @param callbackUrl Optional URL to redirect after sign-in
   * @returns Sign-in URL
   *
   * @example
   * const url = authService.getSignInUrl('google', '/dashboard');
   * return redirect(url);
   */
  getSignInUrl(providerId: string, callbackUrl?: string): string;

  /**
   * Verify if user has a specific role
   *
   * @param session The user's session
   * @param role The role to check
   * @returns True if user has the role
   *
   * @example
   * const session = await authService.getSession({ headers });
   * if (authService.hasRole(session, 'admin')) {
   *   // Allow admin access
   * }
   */
  hasRole(session: AuthSession | null, role: string): Promise<boolean>;

  /**
   * Verify if user has a specific permission
   *
   * @param session The user's session
   * @param permission The permission to check
   * @returns True if user has the permission
   *
   * @example
   * if (await authService.hasPermission(session, 'create:sayings')) {
   *   // Allow creating sayings
   * }
   */
  hasPermission(session: AuthSession | null, permission: string): Promise<boolean>;
}

/**
 * Extended authentication service with additional utilities
 */
export interface IAuthServiceExtended extends IAuthService {
  /**
   * Refresh the session token
   *
   * @param session Current session
   * @returns New session with refreshed token
   */
  refreshSession(session: AuthSession): Promise<AuthSession | null>;

  /**
   * Revoke all sessions for a user
   *
   * @param userId User ID
   * @returns Number of sessions revoked
   */
  revokeAllSessions(userId: string): Promise<number>;

  /**
   * Get all active sessions for a user
   *
   * @param userId User ID
   * @returns List of active sessions
   */
  getUserSessions(userId: string): Promise<AuthSession[]>;
}
