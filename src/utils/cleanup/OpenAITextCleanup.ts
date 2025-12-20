import type { ITextCleanup, CleanupInput, CleanupResult } from './ITextCleanup';
import { createLogger } from '../logger';
import { OPENAI_API_KEY } from 'astro:env/server';

const logger = createLogger('OpenAICleanup');

/**
 * OpenAI API response structure for chat completions
 */
interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenAI implementation of text cleanup
 * Uses GPT-4o-mini for fast and cost-effective text normalization
 */
export class OpenAITextCleanup implements ITextCleanup {
  private apiKey: string | undefined;
  private apiUrl = 'https://api.openai.com/v1/chat/completions';
  private model = 'gpt-4o-mini';

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
   * Clean up and normalize text using OpenAI
   */
  public async cleanupText(input: CleanupInput): Promise<CleanupResult> {
    try {
      if (!this.isConfigured()) {
        logger.warn('OpenAI API key not configured, skipping cleanup');
        return {
          cleanedText: input.text,
          wasModified: false,
          originalText: input.text,
        };
      }

      logger.debug('Cleaning up text', {
        textLength: input.text.length,
        context: input.context,
      });

      const systemPrompt = this.buildSystemPrompt(input.context?.type);
      const userPrompt = this.buildUserPrompt(input.text, input.context?.pronoun);

      // Call OpenAI Chat Completions API
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3, // Low temperature for consistent results
          max_tokens: 100, // Short responses
        }),
      });

      if (!response.ok) {
        logger.error('OpenAI API error during cleanup', {
          status: response.status,
          statusText: response.statusText,
        });

        // Fail gracefully - return original text
        return {
          cleanedText: input.text,
          wasModified: false,
          originalText: input.text,
        };
      }

      const data = (await response.json()) as OpenAIChatResponse;
      const cleanedText = data.choices[0]?.message?.content?.trim() || input.text;

      const wasModified = cleanedText !== input.text;

      logger.debug('Text cleanup result', {
        wasModified,
        originalLength: input.text.length,
        cleanedLength: cleanedText.length,
        tokensUsed: data.usage.total_tokens,
      });

      if (wasModified) {
        logger.info('Text was cleaned up', {
          original: input.text,
          cleaned: cleanedText,
        });
      }

      return {
        cleanedText,
        wasModified,
        originalText: input.text,
      };
    } catch (error) {
      logger.error('Error during text cleanup', { error });
      // Fail gracefully - return original text
      return {
        cleanedText: input.text,
        wasModified: false,
        originalText: input.text,
      };
    }
  }

  /**
   * Build the system prompt based on context
   */
  private buildSystemPrompt(type?: 'firstKind' | 'secondKind' | 'typeName'): string {
    if (type === 'typeName') {
      return `You are a text normalizer for "Two Kinds Of" sayings. Your job is to clean up type names (like "people", "things", "dogs").

Rules:
- Remove trailing punctuation (periods, commas, etc.)
- Convert to lowercase unless it's a proper noun
- Remove extra whitespace
- Keep the text concise and grammatically correct
- Preserve the essential meaning
- Return ONLY the cleaned text, nothing else`;
    }

    return `You are a text normalizer for "Two Kinds Of" sayings. These sayings follow the format: "There are two kinds of [type] — those who [firstKind] and those who [secondKind]."

Your job is to clean up the firstKind or secondKind text to fit this format naturally.

IMPORTANT: The template already adds "those who" (or similar pronouns like "those that", "those which"). Users should ONLY enter the action/description part.

Rules:
- Remove "those who", "those that", "those which", or similar constructions from the beginning
- Remove trailing punctuation (periods, commas, etc.)
- Convert to lowercase unless it's a proper noun
- Normalize verb tenses to fit the format (usually present tense)
- Remove extra whitespace
- Fix capitalization issues
- Keep phrases concise and natural
- Preserve the essential meaning
- The text should complete "those who ___" naturally (without including "those who" itself)
- Return ONLY the cleaned text, nothing else

Examples:
- Input: "those who eat tacos" → Output: "eat tacos"
- Input: "Those Who Like Pizza." → Output: "like pizza"
- Input: "are nice people" → Output: "are nice people"
- Input: "Run Fast." → Output: "run fast"`;
  }

  /**
   * Build the user prompt
   */
  private buildUserPrompt(text: string, pronoun?: string): string {
    if (pronoun) {
      return `Clean up this text that will complete "those ${pronoun} ___":\n\n${text}`;
    }
    return `Clean up this text:\n\n${text}`;
  }
}
