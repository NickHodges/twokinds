import { sequence, defineMiddleware } from 'astro:middleware';
import { getSession } from 'auth-astro/server';
import authConfig from '../auth.config';
import type { ExtendedSession } from './env';
import { upsertUser } from './utils/user-db';
import { createLogger } from './utils/logger';
import { getActionContext } from 'astro:actions';

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

// Middleware to handle action redirects (Post/Redirect/Get)
const handleActionRedirects = defineMiddleware(async (context, next) => {
  // Only process POST requests potentially from actions
  if (context.request.method !== 'POST') {
    return next();
  }

  const { action } = getActionContext(context);

  // Check if the updateSaying action was called from a form
  if (action?.calledFrom === 'form' && action.name === 'updateSaying') {
    logger.info('Handling redirect for updateSaying action...');
    try {
      // Re-run the action handler to get the result
      const result = await action.handler();

      if (result?.data?.success && result.data.updatedId) {
        logger.info('Action successful, redirecting to dashboard.');
        // Redirect to dashboard on success
        return context.redirect('/dashboard?success=saying-updated');
      } else if (result?.error) {
        logger.warn('Action failed, redirecting back with error:', result.error.message);
        // Redirect back to the referring page (the edit page) with the error
        const referer = context.request.headers.get('Referer');
        const errorMsg = encodeURIComponent(result.error.message || 'Update failed');
        // Fallback to dashboard if referer is somehow missing
        const redirectUrl = referer
          ? `${referer.split('?')[0]}?error=${errorMsg}`
          : `/dashboard?error=update-failed-no-referer`;
        return context.redirect(redirectUrl);
      } else {
        // Action might have completed without explicit success/error (shouldn't happen with current setup)
        logger.warn('Action completed without expected success/error structure.');
      }
    } catch (error) {
      // Catch errors during action handler execution itself
      logger.error('Error executing action handler within middleware:', error);
      const referer = context.request.headers.get('Referer');
      const errorMsg = encodeURIComponent(
        error instanceof Error ? error.message : 'Unknown error during update'
      );
      const redirectUrl = referer
        ? `${referer.split('?')[0]}?error=${errorMsg}`
        : '/dashboard?error=update-handler-exception';
      return context.redirect(redirectUrl);
    }
  }

  // If it wasn't the updateSaying action or not from a form, continue
  return next();
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

// Apply middleware in sequence: auth -> handle redirects -> protect routes
export const onRequest = sequence(auth, handleActionRedirects, protectedRoutes);
