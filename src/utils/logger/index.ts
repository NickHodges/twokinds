import type { ILogger } from './ILogger';
import { ConsoleLogger } from './ConsoleLogger';
import { DatabaseLogger } from './DatabaseLogger';
import { HybridLogger } from './HybridLogger';

/**
 * Creates a new logger instance
 * By default, creates a HybridLogger that logs to both console and database
 * @param context The context string to prepend to all log messages
 * @returns An ILogger instance
 */
export function createLogger(context: string): ILogger {
  return new HybridLogger(context);
}

/**
 * Creates a console-only logger (for cases where database logging is not desired)
 * @param context The context string to prepend to all log messages
 * @returns An ILogger instance that only logs to console
 */
export function createConsoleLogger(context: string): ILogger {
  return new ConsoleLogger(context);
}

/**
 * Creates a database-only logger (for cases where console logging is not desired)
 * @param context The context string to prepend to all log messages
 * @returns An ILogger instance that only logs to database
 */
export function createDatabaseLogger(context: string): ILogger {
  return new DatabaseLogger(context);
}

export type { ILogger };
export { ConsoleLogger, DatabaseLogger, HybridLogger };
