import { sequence, defineMiddleware } from 'astro:middleware';
import { auth } from './lib/auth';
import { db, Users, eq } from 'astro:db';
import { createLogger } from './utils/logger';

const logger = createLogger('Middleware');

// Auth middleware to handle sessions
const authMiddleware = defineMiddleware(async ({ locals, request }, next) => {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    locals.session = session;
    locals.user = session?.user ?? null;

    // If user is logged in, sync their information to the app Users table
    if (session?.user?.email) {
      try {
        // Check if app user exists
        const existingUser = await db
          .select()
          .from(Users)
          .where(eq(Users.email, session.user.email))
          .get()
          .catch((err) => {
            logger.error('Error finding user by email:', err);
            return null;
          });

        if (existingUser) {
          // Update existing user
          const updatedUser = await db
            .update(Users)
            .set({
              authUserId: session.user.id,
              name: session.user.name || existingUser.name,
              image: session.user.image || existingUser.image,
              lastLogin: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(Users.id, existingUser.id))
            .returning()
            .get()
            .catch((err) => {
              logger.error('Error updating user:', err);
              return existingUser;
            });

          locals.dbUser = updatedUser;
        } else {
          // Create new app user
          const now = new Date();
          const newUser = await db
            .insert(Users)
            .values({
              authUserId: session.user.id,
              name: session.user.name || '',
              email: session.user.email,
              image: session.user.image || '',
              provider: 'oauth',
              role: 'user',
              lastLogin: now,
              createdAt: now,
              updatedAt: now,
              preferences: {},
            })
            .returning()
            .get()
            .catch((err) => {
              logger.error('Error creating user:', err);
              return null;
            });

          if (newUser) {
            locals.dbUser = newUser;
          }
        }
      } catch (dbError) {
        // Log but continue - don't let database errors break authentication
        logger.error('Database error during user sync:', dbError);
      }
    }

    return next();
  } catch (error) {
    logger.error('Critical middleware error:', error);
    // Continue without session if there's an error
    locals.session = null;
    locals.user = null;
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
export const onRequest = sequence(authMiddleware, protectedRoutes);
