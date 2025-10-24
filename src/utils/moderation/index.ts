import type { IContentModerator } from './IContentModerator';
import { OpenAIContentModerator } from './OpenAIContentModerator';
import { createLogger } from '../logger';

const logger = createLogger('ModerationFactory');

// Singleton instance
let moderatorInstance: IContentModerator | null = null;

/**
 * Get the configured content moderator instance
 * This is a singleton - the same instance is returned on subsequent calls
 *
 * @returns The configured content moderator
 */
export function getContentModerator(): IContentModerator {
  if (!moderatorInstance) {
    // For now, we only have OpenAI implementation
    // In the future, this could check an environment variable
    // to determine which moderator to use
    moderatorInstance = new OpenAIContentModerator();

    if (moderatorInstance.isConfigured()) {
      logger.info('Content moderator initialized', {
        provider: moderatorInstance.getProviderName(),
      });
    } else {
      logger.warn('Content moderator not configured, moderation will be disabled', {
        provider: moderatorInstance.getProviderName(),
      });
    }
  }

  return moderatorInstance;
}

/**
 * Create a new content moderator instance (for testing or specific use cases)
 * @returns A new content moderator instance
 */
export function createContentModerator(): IContentModerator {
  return new OpenAIContentModerator();
}

// Re-export types
export type { IContentModerator, ModerationInput, ModerationResult } from './IContentModerator';
