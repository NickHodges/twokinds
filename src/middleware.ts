import { sequence, defineMiddleware } from 'astro:middleware';
import { getSession } from 'auth-astro/server';
import authConfig from '../auth.config';
import type { Session } from '@auth/core/types';
import { upsertUser } from './utils/user-db';

// Auth middleware to handle sessions
const auth = defineMiddleware(async ({ locals, request }, next) => {
  try {
    console.log('[Auth Middleware] Getting session...');
    const session = (await getSession(request, authConfig)) as Session | null;
    console.log('[Auth Middleware] Session:', session ? 'Found' : 'Not found');
    locals.session = session;

    // If user is logged in, save their information to the database
    if (session?.user) {
      console.log('[Auth Middleware] Upserting user:', session.user.email);
      const user = await upsertUser(session);
      // Optionally store the database user in locals for easy access
      locals.dbUser = user;
    }

    return next();
  } catch (error) {
    console.error('[Auth Middleware] Error:', error);
    // Continue without session if there's an error
    locals.session = null;
    return next();
  }
});

// Custom middleware for protected routes
const protectedRoutes = defineMiddleware(async (context, next) => {
  try {
    const pathname = context.url.pathname;
    console.log('[Protected Routes] Checking path:', pathname);

    // Check if this is a protected route
    const isProtectedRoute =
      pathname.startsWith('/admin') || pathname.startsWith('/dashboard') || pathname === '/profile';

    console.log('[Protected Routes] Is protected:', isProtectedRoute);
    console.log('[Protected Routes] Has session:', !!context.locals.session);

    if (isProtectedRoute && !context.locals.session) {
      console.log('[Protected Routes] Redirecting to home - unauthorized');
      return context.redirect('/?error=unauthorized');
    }

    return next();
  } catch (error) {
    console.error('[Protected Routes] Error:', error);
    // Redirect to home page with error if there's an issue
    return context.redirect('/?error=server_error');
  }
});

// Apply middleware in sequence
export const onRequest = sequence(auth, protectedRoutes);
