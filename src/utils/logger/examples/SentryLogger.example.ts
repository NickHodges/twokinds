/**
 * Example: Custom Sentry Logger Implementation
 *
 * This demonstrates how to create a custom logger that sends errors to Sentry
 * while keeping other log levels local.
 *
 * To use this:
 * 1. npm install @sentry/astro
 * 2. Configure Sentry in your app
 * 3. Use this logger in production
 */

import type { ILogger } from '../ILogger';

interface SentryLike {
  captureException(error: Error, context?: Record<string, unknown>): void;
  captureMessage(message: string, level: 'info' | 'warning' | 'error'): void;
  addBreadcrumb(breadcrumb: {
    message: string;
    level: string;
    data?: Record<string, unknown>;
  }): void;
}

export class SentryLogger implements ILogger {
  private context: string;
  private sentry: SentryLike;

  constructor(context: string, sentry: SentryLike) {
    this.context = context;
    this.sentry = sentry;
  }

  public debug(message: string, ...args: unknown[]): void {
    // Debug logs become breadcrumbs in Sentry
    this.sentry.addBreadcrumb({
      message: `[${this.context}] ${message}`,
      level: 'debug',
      data: this.argsToData(args),
    });
  }

  public info(message: string, ...args: unknown[]): void {
    // Info logs become breadcrumbs in Sentry
    this.sentry.addBreadcrumb({
      message: `[${this.context}] ${message}`,
      level: 'info',
      data: this.argsToData(args),
    });
  }

  public warn(message: string, ...args: unknown[]): void {
    // Warnings are captured as messages in Sentry
    this.sentry.captureMessage(`[${this.context}] ${message}`, 'warning');
    this.sentry.addBreadcrumb({
      message: `[${this.context}] ${message}`,
      level: 'warning',
      data: this.argsToData(args),
    });
  }

  public error(message: string, ...args: unknown[]): void {
    // Errors are captured as exceptions in Sentry
    const error = new Error(`[${this.context}] ${message}`);

    this.sentry.captureException(error, {
      contexts: {
        custom: this.argsToData(args),
      },
    });
  }

  private argsToData(args: unknown[]): Record<string, unknown> | undefined {
    if (args.length === 0) return undefined;
    if (args.length === 1 && typeof args[0] === 'object') {
      return args[0] as Record<string, unknown>;
    }
    return { args };
  }
}

/**
 * Example usage:
 *
 * import * as Sentry from '@sentry/astro';
 * import { createLogger } from '@/utils/logger';
 * import { SentryLogger } from '@/utils/logger/examples/SentryLogger.example';
 *
 * // Initialize Sentry
 * Sentry.init({
 *   dsn: 'your-sentry-dsn',
 *   environment: import.meta.env.MODE,
 * });
 *
 * // Use Sentry logger in production
 * const logger = createLogger('MyService', {
 *   type: 'custom',
 *   customLoggerFactory: (ctx) => new SentryLogger(ctx, Sentry)
 * });
 *
 * // Or combine with console for development
 * import { HybridLogger } from '@/utils/logger';
 * import { ConsoleLogger } from '@/utils/logger';
 *
 * class SentryHybridLogger implements ILogger {
 *   constructor(
 *     private sentryLogger: SentryLogger,
 *     private consoleLogger: ConsoleLogger
 *   ) {}
 *
 *   debug(message: string, ...args: unknown[]): void {
 *     this.consoleLogger.debug(message, ...args);
 *     this.sentryLogger.debug(message, ...args);
 *   }
 *
 *   info(message: string, ...args: unknown[]): void {
 *     this.consoleLogger.info(message, ...args);
 *     this.sentryLogger.info(message, ...args);
 *   }
 *
 *   warn(message: string, ...args: unknown[]): void {
 *     this.consoleLogger.warn(message, ...args);
 *     this.sentryLogger.warn(message, ...args);
 *   }
 *
 *   error(message: string, ...args: unknown[]): void {
 *     this.consoleLogger.error(message, ...args);
 *     this.sentryLogger.error(message, ...args);
 *   }
 * }
 */
