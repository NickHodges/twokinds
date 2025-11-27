# Logger Quick Reference

## Basic Usage

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('MyService');
logger.info('Something happened', { userId: '123' });
```

## Built-in Logger Types

| Type       | Description                  | Use Case                   |
| ---------- | ---------------------------- | -------------------------- |
| `hybrid`   | Console + Database (default) | Production with visibility |
| `console`  | Console only                 | Development                |
| `database` | Database only                | Production audit trail     |
| `null`     | No-op                        | Tests                      |

## Configuration Methods

### 1. Environment Variables (.env)

```bash
LOGGER_TYPE=console
LOGGER_MIN_LEVEL=warn
LOGGER_ASYNC=true
```

### 2. Inline Configuration

```typescript
const logger = createLogger('MyService', {
  type: 'console',
  minLevel: 'warn',
  async: true,
});
```

### 3. Custom Logger

```typescript
import type { ILogger } from '@/utils/logger';

class MyLogger implements ILogger {
  debug(msg: string, ...args: unknown[]): void {
    /* ... */
  }
  info(msg: string, ...args: unknown[]): void {
    /* ... */
  }
  warn(msg: string, ...args: unknown[]): void {
    /* ... */
  }
  error(msg: string, ...args: unknown[]): void {
    /* ... */
  }
}

const logger = createLogger('MyService', {
  type: 'custom',
  customLoggerFactory: (ctx) => new MyLogger(ctx),
});
```

## Common Patterns

### Different Logger Per Environment

```typescript
const logger = createLogger('API', {
  type: import.meta.env.PROD ? 'database' : 'console',
  minLevel: import.meta.env.PROD ? 'warn' : 'debug',
});
```

### Null Logger for Tests

```typescript
import { createNullLogger } from '@/utils/logger';

const logger = createNullLogger('Test');
```

### Dependency Injection

```typescript
class UserService {
  constructor(private logger: ILogger) {}

  async create(data: UserData) {
    this.logger.info('Creating user', { email: data.email });
  }
}

const service = new UserService(createLogger('UserService'));
```

## Log Levels

| Level   | Purpose              | Example                          |
| ------- | -------------------- | -------------------------------- |
| `debug` | Diagnostic details   | Variable values, loop iterations |
| `info`  | Informational events | User actions, state changes      |
| `warn`  | Potential issues     | Deprecated API, fallback used    |
| `error` | Error conditions     | Exceptions, failed operations    |

## Best Practices

✅ **DO:**

- Use descriptive context names
- Structure metadata as objects
- Inject loggers via constructor
- Use async logging in production

❌ **DON'T:**

- Log sensitive data (passwords, tokens)
- Use generic context names
- Block requests with synchronous logging
- Concatenate strings in log messages

## Examples

### Before (console.log)

```typescript
console.log('User ' + userId + ' logged in');
console.error('Failed:', error);
```

### After (structured logging)

```typescript
const logger = createLogger('Auth');
logger.info('User logged in', { userId });
logger.error('Login failed', { error, userId });
```

## Integration Examples

See `/src/utils/logger/examples/` for:

- **SentryLogger.example.ts** - Sentry error tracking
- **PinoLogger.example.ts** - High-performance structured logging

## Files Created

- `ILogger.ts` - Interface (already existed)
- `LoggerConfig.ts` - Configuration types
- `NullLogger.ts` - No-op implementation
- `AsyncLogger.ts` - Non-blocking wrapper
- `FilteredLogger.ts` - Level filtering wrapper
- `README.md` - Comprehensive documentation
- `QUICK_REFERENCE.md` - This file
- `examples/SentryLogger.example.ts` - Sentry integration
- `examples/PinoLogger.example.ts` - Pino integration
