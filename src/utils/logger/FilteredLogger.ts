import type { ILogger } from './ILogger';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Filtered logger that only logs messages at or above a minimum level
 */
export class FilteredLogger implements ILogger {
  private innerLogger: ILogger;
  private minLevel: LogLevel;
  private levelPriority: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Creates a new FilteredLogger
   * @param innerLogger The logger to wrap
   * @param minLevel Minimum log level to record
   */
  constructor(innerLogger: ILogger, minLevel: LogLevel = 'debug') {
    this.innerLogger = innerLogger;
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  public debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      this.innerLogger.debug(message, ...args);
    }
  }

  public info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      this.innerLogger.info(message, ...args);
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      this.innerLogger.warn(message, ...args);
    }
  }

  public error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      this.innerLogger.error(message, ...args);
    }
  }
}
