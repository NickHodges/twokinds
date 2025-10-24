import type { IContentModerator, ModerationInput, ModerationResult } from './IContentModerator';
import { createLogger } from '../logger';
import { OPENAI_API_KEY } from 'astro:env/server';

const logger = createLogger('OpenAIModerator');

/**
 * OpenAI Moderation API response structure
 */
interface OpenAIModerationResponse {
  id: string;
  model: string;
  results: Array<{
    flagged: boolean;
    categories: {
      hate: boolean;
      'hate/threatening': boolean;
      harassment: boolean;
      'harassment/threatening': boolean;
      'self-harm': boolean;
      'self-harm/intent': boolean;
      'self-harm/instructions': boolean;
      sexual: boolean;
      'sexual/minors': boolean;
      violence: boolean;
      'violence/graphic': boolean;
    };
    category_scores: {
      hate: number;
      'hate/threatening': number;
      harassment: number;
      'harassment/threatening': number;
      'self-harm': number;
      'self-harm/intent': number;
      'self-harm/instructions': number;
      sexual: number;
      'sexual/minors': number;
      violence: number;
      'violence/graphic': number;
    };
  }>;
}

/**
 * OpenAI implementation of content moderation
 * Uses the OpenAI Moderation API (free tier)
 */
export class OpenAIContentModerator implements IContentModerator {
  private apiKey: string | undefined;
  private apiUrl = 'https://api.openai.com/v1/moderations';

  constructor() {
    this.apiKey = OPENAI_API_KEY;
  }

  /**
   * Check if the OpenAI API key is configured
   */
  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }

  /**
   * Get the provider name
   */
  public getProviderName(): string {
    return 'OpenAI';
  }

  /**
   * Moderate content using OpenAI Moderation API
   */
  public async moderateContent(input: ModerationInput): Promise<ModerationResult> {
    try {
      if (!this.isConfigured()) {
        logger.warn('OpenAI API key not configured, allowing content by default');
        return {
          isSafe: true,
          reason: 'Moderation not configured',
        };
      }

      logger.debug('Moderating content', {
        textLength: input.text.length,
        userId: input.context?.userId,
      });

      // Call OpenAI Moderation API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          input: input.text,
        }),
      });

      if (!response.ok) {
        logger.error('OpenAI Moderation API error', {
          status: response.status,
          statusText: response.statusText,
        });
        // Fail open - allow content if moderation service is down
        return {
          isSafe: true,
          reason: 'Moderation service unavailable',
        };
      }

      const data = (await response.json()) as OpenAIModerationResponse;
      const result = data.results[0];

      logger.debug('Moderation result', {
        flagged: result.flagged,
        categories: result.categories,
      });

      // If flagged, determine the reason
      if (result.flagged) {
        const flaggedCategories = Object.entries(result.categories)
          .filter(([_, flagged]) => flagged)
          .map(([category]) => category);

        const reason = `Content flagged for: ${flaggedCategories.join(', ')}`;

        logger.info('Content flagged by moderation', {
          reason,
          userId: input.context?.userId,
        });

        return {
          isSafe: false,
          reason,
          categories: result.category_scores,
          confidence: Math.max(...Object.values(result.category_scores)),
          rawResponse: data,
        };
      }

      // Content is safe
      logger.info('Content passed moderation', {
        userId: input.context?.userId,
      });

      return {
        isSafe: true,
        categories: result.category_scores,
        confidence: 1 - Math.max(...Object.values(result.category_scores)),
        rawResponse: data,
      };
    } catch (error) {
      logger.error('Error during content moderation', { error });
      // Fail open - allow content if there's an error
      return {
        isSafe: true,
        reason: 'Moderation error',
      };
    }
  }
}
