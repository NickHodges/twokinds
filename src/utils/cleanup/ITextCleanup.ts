/**
 * Input for text cleanup
 */
export interface CleanupInput {
  text: string;
  context?: {
    type?: 'firstKind' | 'secondKind' | 'typeName';
    pronoun?: string;
  };
}

/**
 * Result of text cleanup
 */
export interface CleanupResult {
  cleanedText: string;
  wasModified: boolean;
  originalText: string;
}

/**
 * Interface for text cleanup services
 */
export interface ITextCleanup {
  /**
   * Check if the cleanup service is configured
   */
  isConfigured(): boolean;

  /**
   * Get the provider name
   */
  getProviderName(): string;

  /**
   * Clean up and normalize text
   */
  cleanupText(input: CleanupInput): Promise<CleanupResult>;
}
