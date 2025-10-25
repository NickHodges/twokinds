import type {
  IRateLimiter,
  RateLimitCheck,
  RateLimitResult,
  RateLimitConfig,
} from './IRateLimiter';
import { db, RateLimits, and, eq, lt } from 'astro:db';
import { createLogger } from '../logger';

const logger = createLogger('RateLimiter');

/**
 * Default rate limit configurations for different actions
 */
const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  create_saying: {
    limit: 10, // 10 sayings per day
    windowSeconds: 86400, // 24 hours
  },
  like_saying: {
    limit: 100, // 100 likes per hour
    windowSeconds: 3600, // 1 hour
  },
  create_type: {
    limit: 5, // 5 new types per day
    windowSeconds: 86400, // 24 hours
  },
};

/**
 * Database-backed rate limiter
 * Uses the RateLimits table to track and enforce limits
 */
export class DatabaseRateLimiter implements IRateLimiter {
  /**
   * Get the configuration for a specific action
   */
  public getConfig(action: string): RateLimitConfig {
    return (
      DEFAULT_CONFIGS[action] || {
        limit: 10,
        windowSeconds: 3600, // Default: 10 per hour
      }
    );
  }

  /**
   * Check if an action is allowed under rate limiting rules
   */
  public async checkLimit(check: RateLimitCheck): Promise<RateLimitResult> {
    try {
      const config = this.getConfig(check.action);
      const limit = check.customLimit ?? config.limit;
      const windowSeconds = check.customWindow ?? config.windowSeconds;

      const identifier = String(check.identifier);
      const now = new Date();

      logger.debug('Checking rate limit', {
        identifier,
        action: check.action,
        limit,
        windowSeconds,
      });

      // Clean up expired records first
      await this.cleanupExpiredRecords();

      // Get or create rate limit record
      const record = await db
        .select()
        .from(RateLimits)
        .where(and(eq(RateLimits.identifier, identifier), eq(RateLimits.action, check.action)))
        .get();

      // If no record exists or window has expired, it's allowed
      if (!record || new Date(record.expiresAt) < now) {
        logger.debug('No active rate limit record found', { identifier, action: check.action });
        return {
          allowed: true,
          current: 0,
          limit,
        };
      }

      // Check if limit is exceeded
      const current = record.count;
      const allowed = current < limit;

      const resetAt = new Date(record.expiresAt).getTime();
      const remainingSeconds = Math.max(0, Math.floor((resetAt - now.getTime()) / 1000));

      logger.debug('Rate limit check result', {
        identifier,
        action: check.action,
        current,
        limit,
        allowed,
        remainingSeconds,
      });

      if (!allowed) {
        logger.warn('Rate limit exceeded', {
          identifier,
          action: check.action,
          current,
          limit,
          remainingSeconds,
        });

        return {
          allowed: false,
          current,
          limit,
          resetAt,
          remainingSeconds,
          reason: `Rate limit exceeded. You can perform this action ${limit} times per ${this.formatDuration(windowSeconds)}. Try again in ${this.formatDuration(remainingSeconds)}.`,
        };
      }

      return {
        allowed: true,
        current,
        limit,
        resetAt,
        remainingSeconds,
      };
    } catch (error) {
      logger.error('Error checking rate limit', { error, check });
      // Fail open - allow the action if there's an error
      return {
        allowed: true,
        current: 0,
        limit: check.customLimit ?? this.getConfig(check.action).limit,
        reason: 'Rate limit check failed',
      };
    }
  }

  /**
   * Record that an action has been performed
   */
  public async recordAction(check: RateLimitCheck): Promise<void> {
    try {
      const config = this.getConfig(check.action);
      const windowSeconds = check.customWindow ?? config.windowSeconds;

      const identifier = String(check.identifier);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + windowSeconds * 1000);

      logger.debug('Recording action', {
        identifier,
        action: check.action,
        windowSeconds,
      });

      // Try to get existing record
      const existing = await db
        .select()
        .from(RateLimits)
        .where(and(eq(RateLimits.identifier, identifier), eq(RateLimits.action, check.action)))
        .get();

      if (existing && new Date(existing.expiresAt) >= now) {
        // Update existing record
        await db
          .update(RateLimits)
          .set({
            count: existing.count + 1,
            updatedAt: now,
          })
          .where(eq(RateLimits.id, existing.id))
          .run();

        logger.debug('Updated rate limit count', {
          identifier,
          action: check.action,
          newCount: existing.count + 1,
        });
      } else {
        // Create new record or replace expired one
        if (existing) {
          // Delete expired record
          await db.delete(RateLimits).where(eq(RateLimits.id, existing.id)).run();
        }

        await db
          .insert(RateLimits)
          .values({
            identifier,
            action: check.action,
            count: 1,
            windowStart: now,
            expiresAt,
            createdAt: now,
            updatedAt: now,
          })
          .run();

        logger.debug('Created new rate limit record', {
          identifier,
          action: check.action,
          expiresAt,
        });
      }
    } catch (error) {
      logger.error('Error recording action', { error, check });
      // Don't throw - we don't want rate limit recording failures to break the app
    }
  }

  /**
   * Get the current count for an identifier and action
   */
  public async getCurrentCount(identifier: string | number, action: string): Promise<number> {
    try {
      const record = await db
        .select()
        .from(RateLimits)
        .where(and(eq(RateLimits.identifier, String(identifier)), eq(RateLimits.action, action)))
        .get();

      if (!record || new Date(record.expiresAt) < new Date()) {
        return 0;
      }

      return record.count;
    } catch (error) {
      logger.error('Error getting current count', { error, identifier, action });
      return 0;
    }
  }

  /**
   * Reset the count for an identifier and action
   */
  public async resetLimit(identifier: string | number, action: string): Promise<void> {
    try {
      await db
        .delete(RateLimits)
        .where(and(eq(RateLimits.identifier, String(identifier)), eq(RateLimits.action, action)))
        .run();

      logger.info('Rate limit reset', { identifier, action });
    } catch (error) {
      logger.error('Error resetting rate limit', { error, identifier, action });
    }
  }

  /**
   * Clean up expired rate limit records
   */
  private async cleanupExpiredRecords(): Promise<void> {
    try {
      const now = new Date();
      const result = await db.delete(RateLimits).where(lt(RateLimits.expiresAt, now)).run();

      if (result.rowsAffected > 0) {
        logger.debug('Cleaned up expired rate limit records', { count: result.rowsAffected });
      }
    } catch (error) {
      logger.error('Error cleaning up expired records', { error });
    }
  }

  /**
   * Format a duration in seconds to a human-readable string
   */
  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }

    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
}
