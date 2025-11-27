import type { ILogger } from './ILogger';

/**
 * Null logger implementation (no-op)
 * Useful for tests or when you want to disable logging completely
 */
export class NullLogger implements ILogger {
  constructor(_context: string) {
    // Context is ignored in null logger
  }

  public debug(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  public info(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  public warn(_message: string, ..._args: unknown[]): void {
    // No-op
  }

  public error(_message: string, ..._args: unknown[]): void {
    // No-op
  }
}
