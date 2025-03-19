import type { APIRoute } from 'astro';
import { db, Likes, eq, and } from 'astro:db';
import { getSession } from 'auth-astro/server';
import authConfig from '../../../auth.config';
import { getUserIdFromSession } from '../../utils/user-db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request, authConfig);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const userId = getUserIdFromSession(session);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 400,
      });
    }

    const { sayingId } = await request.json();
    if (!sayingId) {
      return new Response(JSON.stringify({ error: 'Missing sayingId' }), {
        status: 400,
      });
    }

    // Check if like exists
    const existingLike = await db
      .select()
      .from(Likes)
      .where(and(eq(Likes.userId, userId), eq(Likes.sayingId, sayingId)))
      .get();

    if (existingLike) {
      // Unlike: delete the like
      await db
        .delete(Likes)
        .where(and(eq(Likes.userId, userId), eq(Likes.sayingId, sayingId)))
        .run();

      return new Response(JSON.stringify({ liked: false }));
    } else {
      // Like: create new like
      await db
        .insert(Likes)
        .values({
          userId,
          sayingId,
          createdAt: new Date(),
        })
        .run();

      return new Response(JSON.stringify({ liked: true }));
    }
  } catch (error) {
    console.error('Error in like API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
};
