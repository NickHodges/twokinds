/**
 * Interface for logging operations
 * Provides standard logging methods with support for additional context
 */
export interface ILogger {
  /**
   * Log debug level message
   * @param message The message to log
   * @param args Additional arguments to include in the log
   */
  debug(message: string, ...args: unknown[]): void;

  /**
   * Log info level message
   * @param message The message to log
   * @param args Additional arguments to include in the log
   */
  info(message: string, ...args: unknown[]): void;

  /**
   * Log warning level message
   * @param message The message to log
   * @param args Additional arguments to include in the log
   */
  warn(message: string, ...args: unknown[]): void;

  /**
   * Log error level message
   * @param message The message to log
   * @param args Additional arguments to include in the log
   */
  error(message: string, ...args: unknown[]): void;
}
