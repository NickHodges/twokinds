/**
 * Result of content moderation check
 */
export interface ModerationResult {
  /**
   * Whether the content is safe to publish
   */
  isSafe: boolean;

  /**
   * Human-readable reason for flagging (if flagged)
   */
  reason?: string;

  /**
   * Categories that were flagged with their severity scores (0-1)
   * Example: { hate: 0.8, violence: 0.3 }
   */
  categories?: Record<string, number>;

  /**
   * Overall confidence score (0-1)
   */
  confidence?: number;

  /**
   * Raw response from the moderation provider (for debugging/logging)
   */
  rawResponse?: unknown;
}

/**
 * Content to be moderated
 */
export interface ModerationInput {
  /**
   * The text content to moderate
   */
  text: string;

  /**
   * Optional context about the content
   */
  context?: {
    userId?: number;
    contentType?: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * Interface for content moderation
 * Implementations should check content against various criteria
 * and return whether the content is safe to publish
 */
export interface IContentModerator {
  /**
   * Check if content is safe to publish
   * @param input The content to moderate
   * @returns Moderation result indicating if content is safe
   */
  moderateContent(input: ModerationInput): Promise<ModerationResult>;

  /**
   * Get the name of this moderation provider
   * @returns Provider name (e.g., "OpenAI", "Perspective", "Custom")
   */
  getProviderName(): string;

  /**
   * Check if the moderator is properly configured and ready to use
   * @returns True if ready, false otherwise
   */
  isConfigured(): boolean;
}
