import { sequence, defineMiddleware } from 'astro:middleware';
import { getSession } from 'auth-astro/server';
import authConfig from '../auth.config';
import type { ExtendedSession } from './env';
import { upsertUser } from './utils/user-db';
import { createLogger } from './utils/logger';

const logger = createLogger('Middleware');

// Auth middleware to handle sessions
const auth = defineMiddleware(async ({ locals, request }, next) => {
  try {
    logger.info('Getting session...');
    const session = (await getSession(request, authConfig)) as ExtendedSession | null;
    logger.info('Session:', session ? 'Found' : 'Not found');
    locals.session = session;

    // If user is logged in, save their information to the database
    if (session?.user) {
      logger.info('Upserting user:', session.user.email);
      const user = await upsertUser(session);
      // Optionally store the database user in locals for easy access
      locals.dbUser = user;
    }

    return next();
  } catch (error) {
    logger.error('Error:', error);
    // Continue without session if there's an error
    locals.session = null;
    return next();
  }
});

// Custom middleware for protected routes
const protectedRoutes = defineMiddleware(async (context, next) => {
  try {
    const pathname = context.url.pathname;
    logger.info('Checking path:', pathname);

    // Check if this is a protected route
    const isProtectedRoute =
      pathname.startsWith('/admin') ||
      pathname.startsWith('/dashboard') ||
      pathname === '/profile' ||
      pathname === '/create' ||
      pathname.startsWith('/api/create-saying');

    logger.info('Is protected:', isProtectedRoute);
    logger.info('Has session:', !!context.locals.session);

    if (isProtectedRoute && !context.locals.session) {
      logger.info('Redirecting to home - unauthorized');
      return context.redirect('/?error=unauthorized');
    }

    return next();
  } catch (error) {
    logger.error('Error:', error);
    // Redirect to home page with error if there's an issue
    return context.redirect('/?error=server_error');
  }
});

// Apply middleware in sequence
export const onRequest = sequence(auth, protectedRoutes);
