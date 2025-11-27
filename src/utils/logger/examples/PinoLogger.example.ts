/**
 * Example: Pino Logger Integration
 *
 * Pino is a fast, low-overhead logger for Node.js
 * This shows how to wrap Pino to implement ILogger
 *
 * To use this:
 * 1. npm install pino
 * 2. Use this logger for high-performance structured logging
 */

import type { ILogger } from '../ILogger';

interface PinoLike {
  debug(obj: object, msg?: string): void;
  info(obj: object, msg?: string): void;
  warn(obj: object, msg?: string): void;
  error(obj: object, msg?: string): void;
}

export class PinoLogger implements ILogger {
  private context: string;
  private pino: PinoLike;

  constructor(context: string, pino: PinoLike) {
    this.context = context;
    this.pino = pino;
  }

  public debug(message: string, ...args: unknown[]): void {
    const metadata = this.buildMetadata(args);
    this.pino.debug({ context: this.context, ...metadata }, message);
  }

  public info(message: string, ...args: unknown[]): void {
    const metadata = this.buildMetadata(args);
    this.pino.info({ context: this.context, ...metadata }, message);
  }

  public warn(message: string, ...args: unknown[]): void {
    const metadata = this.buildMetadata(args);
    this.pino.warn({ context: this.context, ...metadata }, message);
  }

  public error(message: string, ...args: unknown[]): void {
    const metadata = this.buildMetadata(args);
    this.pino.error({ context: this.context, ...metadata }, message);
  }

  private buildMetadata(args: unknown[]): Record<string, unknown> {
    if (args.length === 0) return {};
    if (args.length === 1 && typeof args[0] === 'object' && args[0] !== null) {
      return args[0] as Record<string, unknown>;
    }
    return { data: args };
  }
}

/**
 * Example usage:
 *
 * import pino from 'pino';
 * import { createLogger } from '@/utils/logger';
 * import { PinoLogger } from '@/utils/logger/examples/PinoLogger.example';
 *
 * // Create pino instance
 * const pinoInstance = pino({
 *   level: 'debug',
 *   transport: {
 *     target: 'pino-pretty',
 *     options: {
 *       colorize: true
 *     }
 *   }
 * });
 *
 * // Use Pino logger
 * const logger = createLogger('MyService', {
 *   type: 'custom',
 *   customLoggerFactory: (ctx) => new PinoLogger(ctx, pinoInstance)
 * });
 *
 * logger.info('User logged in', { userId: '123', email: 'user@example.com' });
 * // Output: {"level":30,"time":1234567890,"context":"MyService","userId":"123","email":"user@example.com","msg":"User logged in"}
 *
 * // For production with file output:
 * const pinoInstance = pino(
 *   { level: 'info' },
 *   pino.destination('/var/log/app.log')
 * );
 */
