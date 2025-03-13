import type { ILogger } from './ILogger';

/**
 * Console implementation of the ILogger interface
 * Formats messages with context and uses appropriate console methods
 */
export class ConsoleLogger implements ILogger {
  /**
   * Creates a new ConsoleLogger instance
   * @param context The context string to prepend to all log messages
   */
  constructor(private context: string) {}

  /**
   * Formats a message with the logger's context
   * @param message The message to format
   * @returns The formatted message with context
   */
  private formatMessage(message: string): string {
    return `[${this.context}] ${message}`;
  }

  public debug(message: string, ...args: unknown[]): void {
    console.debug(this.formatMessage(message), ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    console.log(this.formatMessage(message), ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage(message), ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    console.error(this.formatMessage(message), ...args);
  }
}
