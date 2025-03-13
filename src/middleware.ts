import { sequence, defineMiddleware } from 'astro:middleware';
import { getSession } from 'auth-astro/server';
import authConfig from '../auth.config';
import type { Session } from '@auth/core/types';

// Auth middleware to handle sessions
const auth = defineMiddleware(async ({ locals, request }, next) => {
  const session = await getSession(request, authConfig) as Session | null;
  locals.session = session;
  return next();
});

// Custom middleware for protected routes
const protectedRoutes = defineMiddleware(async (context, next) => {
  // Check if this is a protected route
  const isProtectedRoute = context.url.pathname.startsWith('/admin') ||
                         context.url.pathname.startsWith('/dashboard');

  if (isProtectedRoute && !context.locals.session) {
    return context.redirect('/?error=unauthorized');
  }

  return next();
});

// Apply middleware in sequence
export const onRequest = sequence(auth, protectedRoutes);