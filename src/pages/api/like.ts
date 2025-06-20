import type { APIRoute } from 'astro';
import { db, Likes, Users, eq, and } from 'astro:db';
import { getSession } from 'auth-astro/server';
import { getUserDbId } from '../../utils/user-db';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Like API');

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the current user's session
    const session = await getSession(request);

    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You must be logged in to like a saying',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Try multiple methods to get the user ID
    let userId: number | null = null;

    // Option 1: Use ID from session if available
    if (typeof session.user.id === 'number') {
      userId = session.user.id;
      logger.info('Using numeric ID from session:', userId);
    }
    // Option 2: Try to look up by email directly
    else if (session.user.email) {
      logger.info('Looking up user by email:', session.user.email);
      
      try {
        const dbUser = await db
          .select()
          .from(Users)
          .where(eq(Users.email, session.user.email))
          .get();
          
        if (dbUser) {
          userId = dbUser.id;
          logger.info('Found user by direct email lookup:', userId);
        }
      } catch (dbError) {
        logger.error('Error finding user by email:', dbError);
      }
    }
    // Option 3: Try getUserDbId as a last resort
    if (!userId) {
      logger.info('Trying getUserDbId utility...');
      userId = await getUserDbId(session.user);
      if (userId) {
        logger.info('Found user ID with getUserDbId:', userId);
      }
    }
    
    // If we still don't have a user ID, create the user
    if (!userId && session.user.email) {
      logger.info('Creating new user for:', session.user.email);
      try {
        const now = new Date();
        const newUser = await db
          .insert(Users)
          .values({
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
          .get();
          
        if (newUser) {
          userId = newUser.id;
          logger.info('Created new user with ID:', userId);
        }
      } catch (createError) {
        logger.error('Error creating user:', createError);
      }
    }
    
    // Final check - if we still don't have a user ID, we can't continue
    if (!userId) {
      logger.error('User not found in database and could not be created:', session.user.email);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not find or create user account',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    logger.info('Using user ID for like operation:', userId);
    
    let data;

    // Handle both JSON and form data
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await request.json();
    } else {
      const formData = await request.formData();
      data = {
        sayingId: Number(formData.get('sayingId')),
        action: formData.get('action'),
      };
    }

    const sayingId = Number(data.sayingId);

    if (!sayingId || isNaN(sayingId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Valid saying ID is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the like already exists
    const existingLike = await db
      .select()
      .from(Likes)
      .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)))
      .get();

    let liked = false;

    if (existingLike) {
      // Unlike if already liked
      await db
        .delete(Likes)
        .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)))
        .run();
      liked = false;
    } else {
      // Like if not already liked
      await db
        .insert(Likes)
        .values({
          sayingId,
          userId: userId,
          createdAt: new Date(),
        })
        .run();
      liked = true;
    }

    return new Response(
      JSON.stringify({
        success: true,
        liked,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    logger.error('Error toggling like status:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to update like status',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
