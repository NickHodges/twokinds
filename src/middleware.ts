import { sequence, defineMiddleware } from 'astro:middleware';
import { getSession } from 'auth-astro/server';
import authConfig from '../auth.config';
import type { Session } from '@auth/core/types';

// Auth middleware to handle sessions
const auth = defineMiddleware(async ({ locals, request }, next) => {
  try {
    const session = (await getSession(request, authConfig)) as Session | null;
    locals.session = session;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    // Continue without session if there's an error
    locals.session = null;
    return next();
  }
});

// Custom middleware for protected routes
const protectedRoutes = defineMiddleware(async (context, next) => {
  try {
    // Check if this is a protected route
    const isProtectedRoute =
      context.url.pathname.startsWith('/admin') || context.url.pathname.startsWith('/dashboard');

    if (isProtectedRoute && !context.locals.session) {
      return context.redirect('/?error=unauthorized');
    }

    return next();
  } catch (error) {
    console.error('Protected routes middleware error:', error);
    // Redirect to home page with error if there's an issue
    return context.redirect('/?error=server_error');
  }
});

// Apply middleware in sequence
export const onRequest = sequence(auth, protectedRoutes);
