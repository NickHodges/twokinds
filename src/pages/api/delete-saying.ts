import { db, Sayings, Likes } from 'astro:db';
import { eq } from 'drizzle-orm';
import { getSession } from 'auth-astro/server';
import authConfig from '../../../auth.config';
import type { ExtendedSession } from '../../env';
import type { APIRoute } from 'astro';
import { z } from 'zod';

// Define the request schema for validation
const requestSchema = z.object({
  sayingId: z.coerce.number().int().positive('Valid saying ID is required'),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Get the request data
    const data = await request.json();

    // Parse and validate using zod
    const parseResult = requestSchema.safeParse(data);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Validation error: ${parseResult.error.message}`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { sayingId } = parseResult.data;

    // Get user session
    const session = (await getSession(request, authConfig)) as ExtendedSession | null;
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You must be logged in to delete a saying',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the saying exists and belongs to the user
    const saying = await db.select().from(Sayings).where(eq(Sayings.id, sayingId)).get();

    if (!saying) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Saying not found',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get database user ID from locals (set by middleware)
    const dbUserId = locals.dbUser?.id;

    if (!dbUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database user ID not found',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (saying.userId !== dbUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'You can only delete your own sayings',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Delete all likes for this saying first
    await db.delete(Likes).where(eq(Likes.sayingId, sayingId)).run();

    // Delete the saying
    await db.delete(Sayings).where(eq(Sayings.id, sayingId)).run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Saying deleted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error deleting saying:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to delete saying',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
