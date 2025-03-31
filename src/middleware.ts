import { sequence, defineMiddleware } from 'astro:middleware';
import { getSession } from 'auth-astro/server';
import authConfig from '../auth.config';
import type { ExtendedSession } from './env';
import { upsertUser } from './utils/user-db';
import { createLogger } from './utils/logger';

// Import development seed to run automatically in dev mode
import './db/development-seed';

const logger = createLogger('Middleware');

// Auth middleware to handle sessions
const auth = defineMiddleware(async ({ locals, request }, next) => {
  try {
    logger.info('Getting session...');
    
    // Wrap in try/catch to prevent authentication errors from breaking the app
    try {
      const session = (await getSession(request, authConfig)) as ExtendedSession | null;
      logger.info('Session:', session ? 'Found' : 'Not found');
      locals.session = session;

      // If user is logged in, save their information to the database
      if (session?.user) {
        if (!session.user.email) {
          logger.warn('User session has no email address:', session.user);
          // Continue without upsert
        } else {
          logger.info('Upserting user:', session.user.email);
          try {
            const user = await upsertUser(session);
            
            if (user) {
              // Store the database user in locals for easy access
              locals.dbUser = user;
              
              // Also add the database ID to the session user
              if (session.user) {
                session.user.dbId = user.id;
                logger.info('Updated session with database ID:', user.id);
              }
            } else {
              logger.warn('Failed to upsert user, but continuing with session');
            }
          } catch (dbError) {
            // Log but continue - don't let database errors break authentication
            logger.error('Database error during upsert:', dbError);
          }
        }
      }
    } catch (authError) {
      logger.error('Authentication error:', authError);
      // Continue without session if there's an auth error
      locals.session = null;
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
  try {
    const pathname = context.url.pathname;
    logger.info('Checking path:', pathname);

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

    logger.info('Is protected:', isProtectedRoute);
    logger.info('Has session:', !!context.locals.session);

    if (isProtectedRoute && !context.locals.session) {
      logger.info('Redirecting to signin - unauthorized');
      return context.redirect('/auth/signin?callbackUrl=' + encodeURIComponent(pathname));
    }

    return next();
  } catch (error) {
    logger.error('Error in protected routes middleware:', error);
    // In a serverless environment, better to continue than redirect on error
    // This makes the app more resilient
    return next();
  }
});

// Apply middleware in sequence
export const onRequest = sequence(auth, protectedRoutes);
