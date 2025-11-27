# Logger System Documentation

A fully pluggable, type-safe logging system for the TwoKinds application.

## Quick Start

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('MyService');

logger.debug('Detailed diagnostic information');
logger.info('General informational messages', { userId: '123' });
logger.warn('Warning about potential issues', { attempt: 3 });
logger.error('Error occurred', { error: err, context: 'payment' });
```

## Architecture

The logging system is built around the `ILogger` interface, making it easy to plug in different implementations.

### ILogger Interface

```typescript
interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

Any class implementing this interface can be used as a logger.

## Built-in Implementations

### 1. ConsoleLogger

Logs to browser/Node.js console with color coding and timestamps.

```typescript
import { createConsoleLogger } from '@/utils/logger';

const logger = createConsoleLogger('MyService');
logger.info('This goes to console only');
```

**Use when:**

- Development environments
- You need real-time log visibility
- Debugging interactively

### 2. DatabaseLogger

Persists logs to the Astro DB `Logs` table for later analysis.

```typescript
import { createDatabaseLogger } from '@/utils/logger';

const logger = createDatabaseLogger('MyService');
logger.error('This goes to database only', { critical: true });
```

**Use when:**

- Production environments
- You need audit trails
- Log analysis and searching is required

### 3. HybridLogger (Default)

Logs to both console AND database simultaneously.

```typescript
const logger = createLogger('MyService'); // Default is hybrid
logger.info('Visible in console AND persisted to DB');
```

**Use when:**

- You want both real-time visibility and persistence
- Production with development-like debugging

### 4. NullLogger

No-op logger that discards all messages.

```typescript
import { createNullLogger } from '@/utils/logger';

const logger = createNullLogger('MyService');
logger.info('This goes nowhere'); // No output
```

**Use when:**

- Unit tests
- Temporarily disabling logging
- Performance-critical code paths

### 5. AsyncLogger (Wrapper)

Makes any logger non-blocking by executing log calls asynchronously.

```typescript
import { AsyncLogger, ConsoleLogger } from '@/utils/logger';

const logger = new AsyncLogger(new ConsoleLogger('MyService'));
logger.info('This logs asynchronously');
// Code continues immediately without waiting
```

**Use when:**

- Database logging might be slow
- You don't want logging to block requests
- High-throughput scenarios

### 6. FilteredLogger (Wrapper)

Only logs messages at or above a minimum level.

```typescript
import { FilteredLogger, ConsoleLogger } from '@/utils/logger';

// Only log warnings and errors
const logger = new FilteredLogger(new ConsoleLogger('MyService'), 'warn');

logger.debug('Ignored'); // Not logged
logger.info('Ignored'); // Not logged
logger.warn('Logged!'); // Logged
logger.error('Logged!'); // Logged
```

**Use when:**

- Production (reduce noise)
- You want to control log verbosity
- Performance optimization

## Configuration

### Environment Variables

Set these in your `.env` file:

```bash
# Logger type: 'console' | 'database' | 'hybrid' | 'null' | 'custom'
LOGGER_TYPE=hybrid

# Minimum log level: 'debug' | 'info' | 'warn' | 'error'
LOGGER_MIN_LEVEL=debug

# Enable async logging (default: true)
LOGGER_ASYNC=true
```

### Programmatic Configuration

```typescript
import { createLogger } from '@/utils/logger';

// Override configuration per logger
const logger = createLogger('MyService', {
  type: 'console',
  minLevel: 'warn',
  async: false,
});
```

## Advanced Usage

### Custom Logger Implementation

Create your own logger by implementing `ILogger`:

```typescript
import type { ILogger } from '@/utils/logger';

class SentryLogger implements ILogger {
  constructor(private context: string) {}

  debug(message: string, ...args: unknown[]): void {
    // Send to Sentry as breadcrumb
  }

  info(message: string, ...args: unknown[]): void {
    // Send to Sentry as info
  }

  warn(message: string, ...args: unknown[]): void {
    // Send to Sentry as warning
  }

  error(message: string, ...args: unknown[]): void {
    // Send to Sentry as error
    Sentry.captureException(new Error(message), {
      contexts: { custom: args[0] as Record<string, unknown> },
    });
  }
}

// Use it
const logger = createLogger('MyService', {
  type: 'custom',
  customLoggerFactory: (ctx) => new SentryLogger(ctx),
});
```

### Combining Loggers

Create a multi-destination logger:

```typescript
import type { ILogger } from '@/utils/logger';
import { ConsoleLogger, DatabaseLogger } from '@/utils/logger';

class MultiLogger implements ILogger {
  private loggers: ILogger[];

  constructor(context: string, loggers: ILogger[]) {
    this.loggers = loggers;
  }

  debug(message: string, ...args: unknown[]): void {
    this.loggers.forEach((l) => l.debug(message, ...args));
  }

  info(message: string, ...args: unknown[]): void {
    this.loggers.forEach((l) => l.info(message, ...args));
  }

  warn(message: string, ...args: unknown[]): void {
    this.loggers.forEach((l) => l.warn(message, ...args));
  }

  error(message: string, ...args: unknown[]): void {
    this.loggers.forEach((l) => l.error(message, ...args));
  }
}

// Log to console, database, and Sentry
const logger = new MultiLogger('MyService', [
  new ConsoleLogger('MyService'),
  new DatabaseLogger('MyService'),
  new SentryLogger('MyService'),
]);
```

### Conditional Logging

```typescript
// Only use database logging in production
const logger = createLogger('MyService', {
  type: import.meta.env.PROD ? 'database' : 'console',
});

// Only show errors in production
const logger = createLogger('MyService', {
  minLevel: import.meta.env.PROD ? 'error' : 'debug',
});
```

## Testing

Use `NullLogger` for tests where you don't want log output:

```typescript
import { describe, test, expect } from 'vitest';
import { createNullLogger } from '@/utils/logger';

describe('MyService', () => {
  test('does something', () => {
    const logger = createNullLogger('Test');
    const service = new MyService(logger);

    // Logs are discarded
    expect(service.doSomething()).toBe(true);
  });
});
```

Or mock the logger:

```typescript
import { vi } from 'vitest';
import type { ILogger } from '@/utils/logger';

const mockLogger: ILogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

const service = new MyService(mockLogger);
service.doSomething();

expect(mockLogger.info).toHaveBeenCalledWith('Something happened');
```

## Best Practices

### 1. Always Use Context

```typescript
// Good
const logger = createLogger('UserService');
const logger = createLogger('PaymentAPI');

// Bad
const logger = createLogger('App'); // Too generic
```

### 2. Structure Your Metadata

```typescript
// Good - structured objects
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  timestamp: new Date(),
  source: 'oauth',
});

// Bad - unstructured strings
logger.info(`User ${user.id} logged in from ${source}`);
```

### 3. Choose Appropriate Log Levels

- **debug**: Detailed diagnostic info (loops, variable values)
- **info**: General informational events (user actions, state changes)
- **warn**: Potentially harmful situations (deprecated API, fallbacks)
- **error**: Error events that might still allow app to continue

### 4. Don't Log Sensitive Data

```typescript
// Good
logger.info('User authenticated', { userId: user.id });

// Bad - leaks credentials
logger.info('User authenticated', { userId: user.id, password: user.password });
```

### 5. Use Async in Production

```typescript
// Production: async logging doesn't block requests
const logger = createLogger('API', {
  type: 'hybrid',
  async: true,
});
```

### 6. Inject Loggers (Dependency Injection)

```typescript
class UserService {
  constructor(private logger: ILogger) {}

  async createUser(data: UserData) {
    this.logger.info('Creating user', { email: data.email });
    // ...
  }
}

// Easy to test and swap implementations
const service = new UserService(createLogger('UserService'));
```

## Examples

### Example 1: Different Loggers per Environment

```typescript
// src/lib/logger.ts
import { createLogger } from '@/utils/logger';

export function getAppLogger(context: string) {
  if (import.meta.env.TEST) {
    return createLogger(context, { type: 'null' });
  }

  if (import.meta.env.PROD) {
    return createLogger(context, {
      type: 'database',
      minLevel: 'warn',
      async: true,
    });
  }

  return createLogger(context, {
    type: 'console',
    minLevel: 'debug',
  });
}
```

### Example 2: Request-Scoped Logger

```typescript
// In middleware
import { defineMiddleware } from 'astro:middleware';
import { createLogger } from '@/utils/logger';

export const onRequest = defineMiddleware(async ({ locals, request }, next) => {
  const requestId = crypto.randomUUID();

  locals.logger = createLogger(`Request:${requestId}`);
  locals.logger.info('Request started', {
    method: request.method,
    url: request.url,
  });

  return next();
});

// In pages/API routes
export const GET = async ({ locals }) => {
  locals.logger.info('Processing GET request');
  // ...
};
```

### Example 3: External Service Logger

```typescript
import type { ILogger } from '@/utils/logger';
import axios from 'axios';

class DatadogLogger implements ILogger {
  constructor(private context: string) {}

  private async send(level: string, message: string, metadata: unknown) {
    await axios.post('https://http-intake.logs.datadoghq.com/v1/input', {
      ddsource: 'twokinds',
      service: this.context,
      level,
      message,
      metadata,
    });
  }

  debug(message: string, ...args: unknown[]): void {
    void this.send('debug', message, args[0]);
  }

  info(message: string, ...args: unknown[]): void {
    void this.send('info', message, args[0]);
  }

  warn(message: string, ...args: unknown[]): void {
    void this.send('warn', message, args[0]);
  }

  error(message: string, ...args: unknown[]): void {
    void this.send('error', message, args[0]);
  }
}

// Use it
const logger = createLogger('MyService', {
  type: 'custom',
  customLoggerFactory: (ctx) => new DatadogLogger(ctx),
});
```

## Migration Guide

If you're migrating from console.log:

```typescript
// Before
console.log('User created');
console.error('Failed:', error);

// After
const logger = createLogger('UserService');
logger.info('User created');
logger.error('Failed', { error });
```

## Performance Considerations

- **ConsoleLogger**: ~0.1ms per call
- **DatabaseLogger**: ~5-10ms per call (synchronous)
- **DatabaseLogger (async)**: ~0.1ms per call (non-blocking)
- **HybridLogger (async)**: ~0.1ms per call (non-blocking)

Use `async: true` (default) for production to avoid blocking.
