import type { ILogger } from './ILogger';

/**
 * Async logger wrapper that makes logging non-blocking
 * Wraps any ILogger implementation and executes log calls asynchronously
 */
export class AsyncLogger implements ILogger {
  private innerLogger: ILogger;

  /**
   * Creates a new AsyncLogger that wraps another logger
   * @param innerLogger The logger to wrap
   */
  constructor(innerLogger: ILogger) {
    this.innerLogger = innerLogger;
  }

  public debug(message: string, ...args: unknown[]): void {
    // Execute async without waiting
    void this.logAsync(() => this.innerLogger.debug(message, ...args));
  }

  public info(message: string, ...args: unknown[]): void {
    void this.logAsync(() => this.innerLogger.info(message, ...args));
  }

  public warn(message: string, ...args: unknown[]): void {
    void this.logAsync(() => this.innerLogger.warn(message, ...args));
  }

  public error(message: string, ...args: unknown[]): void {
    void this.logAsync(() => this.innerLogger.error(message, ...args));
  }

  /**
   * Execute logging asynchronously with error handling
   */
  private async logAsync(logFn: () => void): Promise<void> {
    try {
      await Promise.resolve(logFn());
    } catch (error) {
      // Fallback to console if async logging fails
      console.error('[AsyncLogger] Failed to log:', error);
    }
  }
}
