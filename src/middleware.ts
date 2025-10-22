import { sequence, defineMiddleware } from 'astro:middleware';
import { getSession } from 'auth-astro/server';
import authConfig from '../auth.config';
import type { ExtendedSession } from '../env.d';
import { upsertUser } from './utils/user-db';
import { createLogger } from './utils/logger';

const logger = createLogger('Middleware');

// Auth middleware to handle sessions
const auth = defineMiddleware(async ({ locals, request }, next) => {
  try {
    const session = (await getSession(request, authConfig)) as ExtendedSession | null;
    locals.session = session;

    // If user is logged in, save their information to the database
    if (session?.user?.email) {
      try {
        const user = await upsertUser(session);

        if (user) {
          // Store the database user in locals for easy access
          locals.dbUser = user;

          // Update session with numeric database ID
          const extendedSession: ExtendedSession = locals.session;
          extendedSession.user = { ...extendedSession.user, id: user.id };
        }
      } catch (dbError) {
        // Log but continue - don't let database errors break authentication
        logger.error('Database error during upsert:', dbError);
      }
    }

    return next();
  } catch (error) {
    logger.error('Critical middleware error:', error);
    // Continue without session if there's an error
    locals.session = null;
    return next();
  }
});

// Custom middleware for protected routes
const protectedRoutes = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;

  // Check if this is a protected route
  const isProtectedRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname === '/profile' ||
    pathname === '/create' ||
    pathname.startsWith('/edit-saying') ||
    pathname.startsWith('/api/create-saying') ||
    pathname.startsWith('/api/delete-saying') ||
    pathname.startsWith('/api/user');

  if (isProtectedRoute && !context.locals.session) {
    return context.redirect('/auth/signin?callbackUrl=' + encodeURIComponent(pathname));
  }

  return next();
});

// Apply middleware in sequence
export const onRequest = sequence(auth, protectedRoutes);
