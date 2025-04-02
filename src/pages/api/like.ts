import type { APIRoute } from 'astro';
import { db, Likes, eq, and } from 'astro:db';

import type { ExtendedSession } from '../../env';
import { z } from 'zod';
import { createLogger } from '../../utils/logger';

const logger = createLogger('API/Like');

const LikeSchema = z.object({
  sayingId: z.number().int().positive(),
  action: z.enum(['like', 'unlike']),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const session = locals.session as ExtendedSession | null;

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  const userId = session.user.id;

  try {
    const body = await request.json();
    const parseResult = LikeSchema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ message: 'Invalid input', errors: parseResult.error.flatten() }),
        { status: 400 }
      );
    }

    const { sayingId, action } = parseResult.data;

    if (action === 'like') {
      // Upsert: Try to insert, if it fails due to unique constraint, do nothing (or update timestamp)
      await db
        .insert(Likes)
        .values({
          sayingId,
          userId,
          createdAt: new Date(),
        })
        .onConflictDoNothing(); // Or .onConflictDoUpdate(...) if you want to update timestamp
    } else if (action === 'unlike') {
      await db.delete(Likes).where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)));
    }

    // Get updated like count
    const likeCountResult = await db
      .select({ count: Likes.id.count() })
      .from(Likes)
      .where(eq(Likes.sayingId, sayingId))
      .get();

    const totalLikes = likeCountResult?.count ?? 0;

    return new Response(
      JSON.stringify({
        success: true,
        action: action === 'like' ? 'liked' : 'unliked',
        totalLikes,
      }),
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error toggling like status:', error); // Use logger
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};
