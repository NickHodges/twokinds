# Authentication Service Documentation

A fully pluggable, type-safe authentication system for the TwoKinds application.

## Overview

The authentication system is built around the `IAuthService` interface, making it easy to swap authentication providers (better-auth, Auth.js, Clerk, etc.) without changing your application code.

## Quick Start

```typescript
import { authService } from '@/lib/auth';

// In middleware
const session = await authService.getSession({ headers: request.headers });
if (session) {
  console.log('User:', session.user.email);
}

// In API routes
const result = await authService.signOut({ headers: request.headers });
if (result.success) {
  return redirect('/');
}

// Check available providers
const providers = authService.getProviders();
// [{ id: 'google', name: 'Google', enabled: true }, ...]
```

## Architecture

### IAuthService Interface

The core interface that all authentication providers must implement:

```typescript
interface IAuthService {
  // Session management
  getSession(options: GetSessionOptions): Promise<AuthSession | null>;
  signOut(options: SignOutOptions): Promise<SignOutResult>;

  // Provider management
  getProviders(): OAuthProvider[];
  isProviderEnabled(providerId: string): boolean;
  getSignInUrl(providerId: string, callbackUrl?: string): string;

  // Authorization
  hasRole(session: AuthSession | null, role: string): Promise<boolean>;
  hasPermission(session: AuthSession | null, permission: string): Promise<boolean>;
}
```

### Type Definitions

```typescript
interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: boolean;
}

interface AuthSession {
  user: AuthUser;
  sessionId?: string;
  expiresAt?: Date;
}

interface OAuthProvider {
  id: string;
  name: string;
  enabled: boolean;
}
```

## Built-in Implementations

### 1. BetterAuthService (Default)

The current implementation using better-auth.

```typescript
import { authService } from '@/lib/auth';

const session = await authService.getSession({ headers });
```

**Features:**

- ✅ OAuth providers (Google, GitHub, Facebook, Microsoft, Apple)
- ✅ Session management
- ✅ Database integration (Drizzle + Turso)
- ✅ Secure cookies
- ✅ Email verification

**Configuration:** Already configured in `/src/lib/auth/index.ts`

### 2. MockAuthService (Testing)

A fake authentication service for tests and development.

```typescript
import { MockAuthService } from '@/lib/auth/MockAuthService';

// Create mock authenticated user
const authService = new MockAuthService({
  authenticated: true,
  mockUser: {
    id: 'test-123',
    email: 'test@example.com',
    name: 'Test User',
  },
  roles: ['admin'],
  permissions: ['create:sayings', 'delete:sayings'],
});

// Use in tests
const session = await authService.getSession({ headers: request.headers });
expect(session?.user.email).toBe('test@example.com');
```

**Features:**

- ✅ No external dependencies
- ✅ Configurable users, roles, permissions
- ✅ State management (sign in/out)
- ✅ Helper functions for common scenarios

**Use cases:**

- Unit tests
- Integration tests
- Local development without OAuth setup
- Demo/preview environments

## Usage Patterns

### 1. Middleware Integration

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { authService } from '@/lib/auth';

export const authMiddleware = defineMiddleware(async ({ locals, request }, next) => {
  const session = await authService.getSession({ headers: request.headers });
  locals.session = session;
  return next();
});

export const protectedRoutes = defineMiddleware(async (context, next) => {
  if (!context.locals.session) {
    return context.redirect('/auth/signin');
  }
  return next();
});
```

### 2. API Route Usage

```typescript
// src/pages/api/protected.ts
import type { APIRoute } from 'astro';
import { authService } from '@/lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const session = await authService.getSession({ headers: request.headers });

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  return new Response(JSON.stringify({ user: session.user }));
};
```

### 3. Sign Out

```typescript
// src/pages/api/signout.ts
import type { APIRoute } from 'astro';
import { authService } from '@/lib/auth';

export const POST: APIRoute = async ({ request, redirect }) => {
  const result = await authService.signOut({ headers: request.headers });

  if (result.success) {
    return redirect('/');
  }

  return redirect('/?error=signout-failed');
};
```

### 4. Provider List

```typescript
// src/pages/auth/signin.astro
---
import { authService } from '@/lib/auth';

const providers = authService.getProviders();
---

<div class="providers">
  {providers.map(provider => (
    <a href={authService.getSignInUrl(provider.id, '/dashboard')}>
      Sign in with {provider.name}
    </a>
  ))}
</div>
```

### 5. Role-Based Access

```typescript
// src/pages/admin/index.astro
---
import { authService } from '@/lib/auth';

const session = Astro.locals.session;
const isAdmin = await authService.hasRole(session, 'admin');

if (!isAdmin) {
  return Astro.redirect('/');
}
---

<h1>Admin Dashboard</h1>
```

### 6. Permission-Based Access

```typescript
// src/pages/api/delete-saying.ts
import type { APIRoute } from 'astro';
import { authService } from '@/lib/auth';

export const DELETE: APIRoute = async ({ request, locals }) => {
  const canDelete = await authService.hasPermission(locals.session, 'delete:sayings');

  if (!canDelete) {
    return new Response('Forbidden', { status: 403 });
  }

  // Delete saying...
};
```

## Testing

### Unit Tests with Mock Auth

```typescript
import { describe, test, expect } from 'vitest';
import { MockAuthService } from '@/lib/auth/MockAuthService';

describe('Protected Route', () => {
  test('allows authenticated users', async () => {
    const authService = new MockAuthService({
      authenticated: true,
      mockUser: { id: '123', email: 'test@example.com' },
    });

    const session = await authService.getSession({ headers: new Headers() });
    expect(session).not.toBeNull();
    expect(session?.user.email).toBe('test@example.com');
  });

  test('rejects unauthenticated users', async () => {
    const authService = new MockAuthService({ authenticated: false });

    const session = await authService.getSession({ headers: new Headers() });
    expect(session).toBeNull();
  });
});
```

### Testing with Different Roles

```typescript
import { createMockAdminAuth, createMockUserAuth } from '@/lib/auth/MockAuthService';

describe('Admin Route', () => {
  test('allows admin access', async () => {
    const authService = createMockAdminAuth();
    const session = await authService.getSession({ headers: new Headers() });

    const isAdmin = await authService.hasRole(session, 'admin');
    expect(isAdmin).toBe(true);
  });

  test('denies regular user access', async () => {
    const authService = createMockUserAuth();
    const session = await authService.getSession({ headers: new Headers() });

    const isAdmin = await authService.hasRole(session, 'admin');
    expect(isAdmin).toBe(false);
  });
});
```

### Integration Tests

```typescript
import { test, expect } from '@playwright/test';

test('authenticated user can create saying', async ({ page }) => {
  // Mock auth would be configured in test setup
  await page.goto('/create');

  await page.fill('[name="firstKind"]', 'developers');
  await page.fill('[name="secondKind"]', 'users');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL(/\/create\?success=true/);
});
```

## Switching Authentication Providers

### Example: Migrating to Clerk

1. **Install Clerk:**

   ```bash
   npm install @clerk/astro
   ```

2. **Create ClerkAuthService implementation:**
   See `/src/lib/auth/examples/ClerkAuthService.example.ts`

3. **Update auth configuration:**

   ```typescript
   // src/lib/auth/index.ts
   import { ClerkAuthService } from './examples/ClerkAuthService.example';
   import { createClerkClient } from '@clerk/astro/server';

   const clerkClient = createClerkClient({
     secretKey: import.meta.env.CLERK_SECRET_KEY,
   });

   export const authService = new ClerkAuthService(clerkClient);
   ```

4. **No other code changes needed!** Your middleware, API routes, and pages continue to work.

### Example: Migrating to Auth.js

1. **Install Auth.js:**

   ```bash
   npm install auth-astro @auth/core
   ```

2. **Create AuthJsService implementation:**
   See `/src/lib/auth/examples/AuthJsService.example.ts`

3. **Update auth configuration:**

   ```typescript
   // src/lib/auth/index.ts
   import { AuthJsService } from './examples/AuthJsService.example';
   import { getServerSession } from 'auth-astro/server';

   const authConfig = {
     providers: [
       /* ... */
     ],
   };

   export const authService = new AuthJsService(
     async (options) => getServerSession(options.headers, authConfig),
     authConfig
   );
   ```

## Custom Implementation

Create your own auth service by implementing `IAuthService`:

```typescript
import type { IAuthService, AuthSession, GetSessionOptions } from '@/lib/auth';

class MyCustomAuthService implements IAuthService {
  async getSession(options: GetSessionOptions): Promise<AuthSession | null> {
    // Your implementation
  }

  async signOut(options: SignOutOptions): Promise<SignOutResult> {
    // Your implementation
  }

  getProviders(): OAuthProvider[] {
    // Your implementation
  }

  isProviderEnabled(providerId: string): boolean {
    // Your implementation
  }

  getSignInUrl(providerId: string, callbackUrl?: string): string {
    // Your implementation
  }

  async hasRole(session: AuthSession | null, role: string): Promise<boolean> {
    // Your implementation
  }

  async hasPermission(session: AuthSession | null, permission: string): Promise<boolean> {
    // Your implementation
  }
}

export const authService = new MyCustomAuthService();
```

## Best Practices

### 1. Always Use the Interface

```typescript
// Good - uses interface
import { authService } from '@/lib/auth';

// Bad - tightly coupled to better-auth
import { auth } from '@/lib/auth';
await auth.api.getSession(...);
```

### 2. Inject Dependencies

```typescript
class UserService {
  constructor(private authService: IAuthService) {}

  async getCurrentUser() {
    const session = await this.authService.getSession({ headers });
    return session?.user;
  }
}

// Easy to test with mock
const service = new UserService(new MockAuthService());
```

### 3. Handle Null Sessions

```typescript
// Always check for null
const session = await authService.getSession({ headers });
if (!session) {
  return new Response('Unauthorized', { status: 401 });
}

// Now session.user is safe to use
console.log(session.user.email);
```

### 4. Use Type Guards

```typescript
function isAuthenticated(session: AuthSession | null): session is AuthSession {
  return session !== null;
}

const session = await authService.getSession({ headers });
if (isAuthenticated(session)) {
  // TypeScript knows session is not null here
  console.log(session.user.email);
}
```

### 5. Implement Roles/Permissions

The default implementations return `false` for roles/permissions. Implement these based on your needs:

```typescript
// Extend BetterAuthService to add role support
class AppAuthService extends BetterAuthService {
  async hasRole(session: AuthSession | null, role: string): Promise<boolean> {
    if (!session) return false;

    // Query your Users table for role
    const user = await db.select().from(Users).where(eq(Users.id, session.user.id)).get();

    return user?.role === role;
  }
}
```

## File Structure

```
src/lib/auth/
├── IAuthService.ts                  # Core interface
├── BetterAuthService.ts             # better-auth implementation
├── MockAuthService.ts               # Testing/mock implementation
├── index.ts                         # Main export and configuration
├── README.md                        # This file
└── examples/
    ├── ClerkAuthService.example.ts  # Clerk integration example
    └── AuthJsService.example.ts     # Auth.js integration example
```

## Migration from Old Auth

If you were using the old auth setup directly:

```typescript
// Old way
import { auth } from '@/lib/auth';
const session = await auth.api.getSession({ headers });

// New way
import { authService } from '@/lib/auth';
const session = await authService.getSession({ headers });
```

The `auth` export still exists for backward compatibility, but use `authService` for new code.

## Advanced Features

### Custom Session Extension

```typescript
interface ExtendedAuthSession extends AuthSession {
  customField: string;
}

class CustomAuthService extends BetterAuthService {
  async getSession(options: GetSessionOptions): Promise<ExtendedAuthSession | null> {
    const session = await super.getSession(options);
    if (!session) return null;

    return {
      ...session,
      customField: 'custom value',
    };
  }
}
```

### Multi-Tenant Support

```typescript
async hasPermission(
  session: AuthSession | null,
  permission: string,
  tenantId?: string
): Promise<boolean> {
  if (!session) return false;

  // Check permission within specific tenant context
  const userPermissions = await db
    .select()
    .from(Permissions)
    .where(
      and(
        eq(Permissions.userId, session.user.id),
        eq(Permissions.tenantId, tenantId || 'default')
      )
    );

  return userPermissions.some(p => p.permission === permission);
}
```

## Troubleshooting

### Session not persisting

Check that cookies are being set correctly:

- Verify `useSecureCookies` setting matches your environment
- Check that `baseURL` is correct
- Ensure `trustedOrigins` includes your domain

### Type errors

Make sure you're using the interface types:

```typescript
import type { AuthSession } from '@/lib/auth';

function myFunction(session: AuthSession) {
  // ...
}
```

### Mock auth not working in tests

Reset the mock between tests:

```typescript
import { MockAuthService } from '@/lib/auth/MockAuthService';

let authService: MockAuthService;

beforeEach(() => {
  authService = new MockAuthService();
});

afterEach(() => {
  authService.reset();
});
```

## Performance Considerations

- **Session lookup**: ~5-10ms per request (cached by better-auth)
- **Role check**: Varies based on implementation (add caching if needed)
- **Permission check**: Varies based on implementation (add caching if needed)

## Summary

The authentication system provides:

✅ **Pluggable** - Swap providers via interface
✅ **Type-Safe** - Full TypeScript support
✅ **Testable** - MockAuthService for tests
✅ **Production-Ready** - Better-auth by default
✅ **Flexible** - Custom implementations supported
✅ **Well-Documented** - Examples for common providers

For questions or issues, see the examples in `/src/lib/auth/examples/`.
