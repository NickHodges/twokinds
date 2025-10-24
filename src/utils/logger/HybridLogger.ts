import type { ILogger } from './ILogger';
import { ConsoleLogger } from './ConsoleLogger';
import { DatabaseLogger } from './DatabaseLogger';

/**
 * Hybrid logger that logs to both console and database
 * This ensures logs are visible in real-time AND persisted for later analysis
 */
export class HybridLogger implements ILogger {
  private consoleLogger: ConsoleLogger;
  private databaseLogger: DatabaseLogger;

  /**
   * Creates a new HybridLogger instance
   * @param context The context string for the logger
   */
  constructor(context: string) {
    this.consoleLogger = new ConsoleLogger(context);
    this.databaseLogger = new DatabaseLogger(context);
  }

  public debug(message: string, ...args: unknown[]): void {
    this.consoleLogger.debug(message, ...args);
    this.databaseLogger.debug(message, ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    this.consoleLogger.info(message, ...args);
    this.databaseLogger.info(message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.consoleLogger.warn(message, ...args);
    this.databaseLogger.warn(message, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    this.consoleLogger.error(message, ...args);
    this.databaseLogger.error(message, ...args);
  }
}
