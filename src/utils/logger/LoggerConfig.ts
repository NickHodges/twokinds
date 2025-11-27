/**
 * Logger configuration types and utilities
 * Allows pluggable logger implementations via configuration
 */

export type LoggerType = 'console' | 'database' | 'hybrid' | 'null' | 'custom';

export interface LoggerConfig {
  /**
   * The type of logger to use
   * - 'console': Log to console only
   * - 'database': Log to database only
   * - 'hybrid': Log to both console and database (default)
   * - 'null': No-op logger (useful for tests)
   * - 'custom': Use a custom logger implementation
   */
  type: LoggerType;

  /**
   * Minimum log level to record
   * Logs below this level will be ignored
   */
  minLevel?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * Whether to log asynchronously (non-blocking)
   * Default: true
   */
  async?: boolean;

  /**
   * Custom logger factory function
   * Only used when type is 'custom'
   */
  customLoggerFactory?: (context: string) => import('./ILogger').ILogger;

  /**
   * Additional metadata to include in all logs
   */
  globalMetadata?: Record<string, unknown>;
}

/**
 * Default logger configuration
 */
export const defaultLoggerConfig: LoggerConfig = {
  type: 'hybrid',
  minLevel: 'debug',
  async: true,
  globalMetadata: {},
};

/**
 * Get logger configuration from environment or defaults
 */
export function getLoggerConfig(): LoggerConfig {
  const type = (import.meta.env.LOGGER_TYPE as LoggerType) || defaultLoggerConfig.type;
  const minLevel =
    (import.meta.env.LOGGER_MIN_LEVEL as LoggerConfig['minLevel']) || defaultLoggerConfig.minLevel;
  const async = import.meta.env.LOGGER_ASYNC !== 'false';

  return {
    type,
    minLevel,
    async,
    globalMetadata: defaultLoggerConfig.globalMetadata,
  };
}
