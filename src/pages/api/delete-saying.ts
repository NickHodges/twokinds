import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import authConfig from '../../../auth.config';
import { db, Sayings, eq, and } from 'astro:db';
import type { ExtendedSession } from '../../env';

export const POST: APIRoute = async ({ request, redirect }) => {
  try {
    // Get the current user's session
    const session = await getSession(request, authConfig) as ExtendedSession | null;

    // Check if user is authenticated
    if (!session?.user?.id) {
      return new Response(
        JSON.stringify({ error: 'You must be logged in to delete a saying' }),
        { status: 401 }
      );
    }

    // Get the saying ID from the request body
    const body = await request.json();
    const { sayingId } = body;

    if (!sayingId || typeof sayingId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid saying ID' }),
        { status: 400 }
      );
    }

    // First, verify that the saying exists and belongs to the current user
    const saying = await db
      .select()
      .from(Sayings)
      .where(and(eq(Sayings.id, sayingId), eq(Sayings.userId, session.user.id)))
      .get();

    if (!saying) {
      return new Response(
        JSON.stringify({ error: 'Saying not found or you are not authorized to delete it' }),
        { status: 404 }
      );
    }

    // If everything is valid, delete the saying
    await db
      .delete(Sayings)
      .where(and(eq(Sayings.id, sayingId), eq(Sayings.userId, session.user.id)));

    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting saying:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete saying' }),
      { status: 500 }
    );
  }
};