import type { ILogger } from './ILogger';
import { ConsoleLogger } from './ConsoleLogger';
import { DatabaseLogger } from './DatabaseLogger';
import { HybridLogger } from './HybridLogger';
import { NullLogger } from './NullLogger';
import { AsyncLogger } from './AsyncLogger';
import { FilteredLogger } from './FilteredLogger';
import { getLoggerConfig, type LoggerConfig } from './LoggerConfig';

/**
 * Creates a new logger instance based on configuration
 * Configuration can be set via environment variables or passed directly
 *
 * @param context The context string to prepend to all log messages
 * @param config Optional configuration to override defaults
 * @returns An ILogger instance
 *
 * @example
 * // Use default configuration (from env or defaults)
 * const logger = createLogger('MyService');
 *
 * @example
 * // Use custom configuration
 * const logger = createLogger('MyService', { type: 'console', minLevel: 'warn' });
 *
 * @example
 * // Use custom logger implementation
 * const logger = createLogger('MyService', {
 *   type: 'custom',
 *   customLoggerFactory: (ctx) => new MyCustomLogger(ctx)
 * });
 */
export function createLogger(context: string, config?: Partial<LoggerConfig>): ILogger {
  const finalConfig = { ...getLoggerConfig(), ...config };

  // Create base logger based on type
  let logger: ILogger;

  switch (finalConfig.type) {
    case 'console':
      logger = new ConsoleLogger(context);
      break;
    case 'database':
      logger = new DatabaseLogger(context);
      break;
    case 'hybrid':
      logger = new HybridLogger(context);
      break;
    case 'null':
      logger = new NullLogger(context);
      break;
    case 'custom':
      if (!finalConfig.customLoggerFactory) {
        throw new Error('customLoggerFactory must be provided when using custom logger type');
      }
      logger = finalConfig.customLoggerFactory(context);
      break;
    default:
      logger = new HybridLogger(context);
  }

  // Apply filters if min level is set
  if (finalConfig.minLevel && finalConfig.minLevel !== 'debug') {
    logger = new FilteredLogger(logger, finalConfig.minLevel);
  }

  // Wrap in async logger if enabled
  if (finalConfig.async) {
    logger = new AsyncLogger(logger);
  }

  return logger;
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

/**
 * Creates a null logger (no-op, useful for tests)
 * @param context The context string (ignored)
 * @returns An ILogger instance that does nothing
 */
export function createNullLogger(context: string): ILogger {
  return new NullLogger(context);
}

export type { ILogger, LoggerConfig };
export { ConsoleLogger, DatabaseLogger, HybridLogger, NullLogger, AsyncLogger, FilteredLogger };
