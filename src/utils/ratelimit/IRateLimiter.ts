/**
 * Result of a rate limit check
 */
export interface RateLimitResult {
  /**
   * Whether the action is allowed
   */
  allowed: boolean;

  /**
   * Current count of actions in the time window
   */
  current: number;

  /**
   * Maximum allowed actions in the time window
   */
  limit: number;

  /**
   * Time when the limit will reset (in milliseconds since epoch)
   */
  resetAt?: number;

  /**
   * Time remaining until reset (in seconds)
   */
  remainingSeconds?: number;

  /**
   * Reason for denial (if not allowed)
   */
  reason?: string;
}

/**
 * Rate limit check parameters
 */
export interface RateLimitCheck {
  /**
   * Unique identifier for the entity being rate limited (e.g., user ID)
   */
  identifier: string | number;

  /**
   * Action being rate limited (e.g., "create_saying", "like_saying")
   */
  action: string;

  /**
   * Optional custom limit override
   */
  customLimit?: number;

  /**
   * Optional custom time window override (in seconds)
   */
  customWindow?: number;
}

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfig {
  /**
   * Maximum number of actions allowed in the time window
   */
  limit: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;
}

/**
 * Interface for rate limiting
 * Implementations should track actions and enforce limits
 */
export interface IRateLimiter {
  /**
   * Check if an action is allowed under rate limiting rules
   * @param check The rate limit check parameters
   * @returns Result indicating if the action is allowed
   */
  checkLimit(check: RateLimitCheck): Promise<RateLimitResult>;

  /**
   * Record that an action has been performed
   * Should be called after a successful action
   * @param check The rate limit check parameters
   */
  recordAction(check: RateLimitCheck): Promise<void>;

  /**
   * Get the current count for an identifier and action
   * @param identifier The entity identifier
   * @param action The action being checked
   * @returns Current count
   */
  getCurrentCount(identifier: string | number, action: string): Promise<number>;

  /**
   * Reset the count for an identifier and action
   * @param identifier The entity identifier
   * @param action The action to reset
   */
  resetLimit(identifier: string | number, action: string): Promise<void>;

  /**
   * Get the configuration for a specific action
   * @param action The action name
   * @returns The rate limit configuration
   */
  getConfig(action: string): RateLimitConfig;
}
