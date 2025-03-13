export { ILogger } from './ILogger';
export { ConsoleLogger } from './ConsoleLogger';

/**
 * Creates a new logger instance
 * @param context The context string to prepend to all log messages
 * @returns An ILogger instance
 */
export function createLogger(context: string): ILogger {
  return new ConsoleLogger(context);
}
