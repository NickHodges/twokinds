# Auth Service Quick Reference

## Basic Usage

```typescript
import { authService } from '@/lib/auth';

// Get current session
const session = await authService.getSession({ headers: request.headers });

// Sign out
await authService.signOut({ headers: request.headers });

// Get available providers
const providers = authService.getProviders();

// Check if provider is enabled
const hasGithub = authService.isProviderEnabled('github');

// Get sign-in URL
const url = authService.getSignInUrl('google', '/dashboard');
```

## Type Definitions

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
```

## Common Patterns

### Middleware

```typescript
import { authService } from '@/lib/auth';

const session = await authService.getSession({ headers: request.headers });
locals.session = session;
```

### Protected Routes

```typescript
if (!locals.session) {
  return context.redirect('/auth/signin');
}
```

### Sign-In Page

```typescript
const providers = authService.getProviders();

{providers.map(p => (
  <a href={authService.getSignInUrl(p.id, '/dashboard')}>
    Sign in with {p.name}
  </a>
))}
```

### Role Check

```typescript
const isAdmin = await authService.hasRole(session, 'admin');
if (!isAdmin) {
  return new Response('Forbidden', { status: 403 });
}
```

### Permission Check

```typescript
const canDelete = await authService.hasPermission(session, 'delete:sayings');
if (!canDelete) {
  return new Response('Forbidden', { status: 403 });
}
```

## Testing

```typescript
import { MockAuthService } from '@/lib/auth/MockAuthService';

// Mock authenticated user
const authService = new MockAuthService({
  authenticated: true,
  mockUser: { id: '123', email: 'test@example.com' },
  roles: ['admin'],
  permissions: ['create:sayings'],
});

// Or use helpers
import { createMockAdminAuth, createMockUserAuth } from '@/lib/auth/MockAuthService';

const adminAuth = createMockAdminAuth();
const userAuth = createMockUserAuth();
```

## Switching Providers

### To Clerk

```typescript
import { ClerkAuthService } from '@/lib/auth/examples/ClerkAuthService.example';
import { createClerkClient } from '@clerk/astro/server';

const clerkClient = createClerkClient({
  secretKey: import.meta.env.CLERK_SECRET_KEY,
});

export const authService = new ClerkAuthService(clerkClient);
```

### To Auth.js

```typescript
import { AuthJsService } from '@/lib/auth/examples/AuthJsService.example';
import { getServerSession } from 'auth-astro/server';

export const authService = new AuthJsService(
  async (options) => getServerSession(options.headers, authConfig),
  authConfig
);
```

## Custom Implementation

```typescript
import type { IAuthService, AuthSession, GetSessionOptions } from '@/lib/auth';

class MyAuthService implements IAuthService {
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
```

## Files

- `IAuthService.ts` - Core interface
- `BetterAuthService.ts` - better-auth implementation (default)
- `MockAuthService.ts` - Testing/mock implementation
- `index.ts` - Main export
- `examples/` - Integration examples
- `README.md` - Full documentation
