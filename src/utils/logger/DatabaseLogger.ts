import type { ILogger } from './ILogger';
import { db, Logs } from 'astro:db';

/**
 * Database implementation of the ILogger interface
 * Persists log messages to the database for later analysis
 * Note: Logging is fire-and-forget to avoid blocking application flow
 */
export class DatabaseLogger implements ILogger {
  /**
   * Creates a new DatabaseLogger instance
   * @param context The context string to identify the logger
   */
  constructor(private context: string) {}

  /**
   * Inserts a log entry into the database
   * This is fire-and-forget - errors are caught and logged to console to prevent infinite loops
   */
  private async insertLog(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    metadata?: unknown
  ): Promise<void> {
    try {
      // Fire and forget - don't await this
      db.insert(Logs)
        .values({
          level,
          context: this.context,
          message,
          metadata: metadata !== undefined ? metadata : null,
          createdAt: new Date(),
        })
        .run()
        .catch((err) => {
          // Fallback to console if database logging fails
          console.error('[DatabaseLogger] Failed to insert log:', err);
        });
    } catch (error) {
      // Fallback to console if database logging fails
      console.error('[DatabaseLogger] Error in insertLog:', error);
    }
  }

  /**
   * Formats metadata from multiple arguments
   */
  private formatMetadata(...args: unknown[]): unknown {
    if (args.length === 0) {
      return null;
    }
    if (args.length === 1) {
      return args[0];
    }
    return args;
  }

  public debug(message: string, ...args: unknown[]): void {
    this.insertLog('debug', message, this.formatMetadata(...args));
  }

  public info(message: string, ...args: unknown[]): void {
    this.insertLog('info', message, this.formatMetadata(...args));
  }

  public warn(message: string, ...args: unknown[]): void {
    this.insertLog('warn', message, this.formatMetadata(...args));
  }

  public error(message: string, ...args: unknown[]): void {
    this.insertLog('error', message, this.formatMetadata(...args));
  }
}
