import type { IRateLimiter } from './IRateLimiter';
import { DatabaseRateLimiter } from './DatabaseRateLimiter';
import { createLogger } from '../logger';

const logger = createLogger('RateLimitFactory');

// Singleton instance
let rateLimiterInstance: IRateLimiter | null = null;

/**
 * Get the configured rate limiter instance
 * This is a singleton - the same instance is returned on subsequent calls
 *
 * @returns The configured rate limiter
 */
export function getRateLimiter(): IRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new DatabaseRateLimiter();
    logger.info('Rate limiter initialized');
  }

  return rateLimiterInstance;
}

/**
 * Create a new rate limiter instance (for testing or specific use cases)
 * @returns A new rate limiter instance
 */
export function createRateLimiter(): IRateLimiter {
  return new DatabaseRateLimiter();
}

// Re-export types
export type {
  IRateLimiter,
  RateLimitCheck,
  RateLimitResult,
  RateLimitConfig,
} from './IRateLimiter';
