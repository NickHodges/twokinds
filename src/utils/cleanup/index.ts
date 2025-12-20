import type { ITextCleanup } from './ITextCleanup';
import { OpenAITextCleanup } from './OpenAITextCleanup';
import { createLogger } from '../logger';

const logger = createLogger('CleanupFactory');

let cleanupInstance: ITextCleanup | null = null;

/**
 * Get the configured text cleanup service
 * Currently only supports OpenAI
 */
export function getTextCleanup(): ITextCleanup {
  if (!cleanupInstance) {
    cleanupInstance = new OpenAITextCleanup();
    logger.info('Text cleanup service initialized', {
      provider: cleanupInstance.getProviderName(),
    });
  }

  return cleanupInstance;
}

// Re-export types for convenience
export type { ITextCleanup, CleanupInput, CleanupResult } from './ITextCleanup';
