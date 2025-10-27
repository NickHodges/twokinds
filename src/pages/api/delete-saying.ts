import { db, Sayings, Likes } from 'astro:db';
import { eq } from 'drizzle-orm';
import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Delete Saying API');

// Define the request schema for validation
const requestSchema = z.object({
  sayingId: z.coerce.number().int().positive('Valid saying ID is required'),
});

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  logger.debug('Delete saying API called');

  try {
    // Get the request data from form
    const formData = await request.formData();
    const data = {
      sayingId: formData.get('sayingId'),
    };

    // Parse and validate using zod
    const parseResult = requestSchema.safeParse(data);
    if (!parseResult.success) {
      logger.warn('Validation error in delete saying', { error: parseResult.error.message });
      return redirect(`/dashboard?error=${encodeURIComponent('Invalid saying ID')}`, 302);
    }

    const { sayingId } = parseResult.data;
    logger.debug('Attempting to delete saying', { sayingId });

    // Get user session from locals (set by middleware)
    const session = locals.session;
    if (!session?.user?.id) {
      logger.warn('Unauthenticated delete attempt', { sayingId });
      return redirect('/auth/signin?error=login-required', 302);
    }

    // Check if the saying exists and belongs to the user
    const saying = await db.select().from(Sayings).where(eq(Sayings.id, sayingId)).get();

    if (!saying) {
      logger.warn('Saying not found', { sayingId });
      return redirect('/dashboard?error=saying-not-found', 302);
    }

    // Get database user ID from locals (set by middleware)
    const dbUserId = locals.dbUser?.id;

    if (!dbUserId) {
      logger.error('Database user ID not found in locals', {
        sessionUserId: session.user.id,
        sayingId,
      });
      return redirect('/dashboard?error=user-not-found', 302);
    }

    if (saying.userId !== dbUserId) {
      logger.warn('Unauthorized delete attempt', {
        sayingId,
        userId: dbUserId,
        sayingUserId: saying.userId,
      });
      return redirect('/dashboard?error=unauthorized', 302);
    }

    logger.info('Deleting saying and associated likes', { sayingId, userId: dbUserId });

    // Delete all likes for this saying first
    await db.delete(Likes).where(eq(Likes.sayingId, sayingId)).run();

    // Delete the saying
    await db.delete(Sayings).where(eq(Sayings.id, sayingId)).run();

    logger.info('Successfully deleted saying', { sayingId, userId: dbUserId });

    return redirect('/dashboard?success=saying-deleted', 302);
  } catch (error) {
    logger.error('Error deleting saying', { error });
    return redirect('/dashboard?error=delete-failed', 302);
  }
};
