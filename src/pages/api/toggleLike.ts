import type { APIRoute } from 'astro';
import { db, Likes, and, eq } from 'astro:db';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Toggle Like API');

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  logger.debug('Toggle like API called');

  try {
    // Get user ID from locals (set by middleware)
    const userId = locals.dbUser?.id;

    if (!userId) {
      logger.warn('Unauthenticated like attempt');
      return redirect('/?error=login-required', 302);
    }

    // Get form data
    const formData = await request.formData();
    const sayingId = Number(formData.get('sayingId'));

    if (!sayingId || isNaN(sayingId)) {
      logger.warn('Invalid sayingId', { sayingId: formData.get('sayingId') });
      return redirect('/?error=invalid-saying', 302);
    }

    logger.debug('Processing toggle like', { userId, sayingId });

    // Check rate limits
    const { getRateLimiter } = await import('../../utils/ratelimit');
    const rateLimiter = getRateLimiter();

    const rateLimitCheck = await rateLimiter.checkLimit({
      identifier: userId,
      action: 'toggle_like',
      limit: 30, // 30 likes per minute
      windowMs: 60000, // 1 minute window
    });

    if (!rateLimitCheck.allowed) {
      logger.warn('Rate limit exceeded for like toggle', {
        userId,
        current: rateLimitCheck.current,
        limit: rateLimitCheck.limit,
      });
      const referer = request.headers.get('referer') || '/';
      return redirect(`${referer}?error=rate-limit`, 302);
    }

    // Check if the like already exists
    const existingLike = await db
      .select()
      .from(Likes)
      .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)))
      .get();

    if (existingLike) {
      // Unlike
      await db
        .delete(Likes)
        .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)))
        .run();

      logger.info('User unliked saying', { userId, sayingId });
    } else {
      // Like
      await db
        .insert(Likes)
        .values({
          sayingId,
          userId,
          createdAt: new Date(),
        })
        .run();

      logger.info('User liked saying', { userId, sayingId });
    }

    // Record the action for rate limiting
    await rateLimiter.recordAction({
      identifier: userId,
      action: 'toggle_like',
    });

    // Redirect back to the referring page, or home if no referer
    const referer = request.headers.get('referer') || '/';
    return redirect(referer, 302);
  } catch (error) {
    logger.error('Error toggling like', { error });
    const referer = request.headers.get('referer') || '/';
    return redirect(`${referer}?error=like-failed`, 302);
  }
};
