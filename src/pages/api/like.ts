import type { APIRoute } from 'astro';
import { db, Likes, eq, and } from 'astro:db';
import { getSession } from 'auth-astro/server';

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

    // Convert user ID to numeric for database operations
    const numericUserId = parseInt(session.user.id, 10);
    
    if (isNaN(numericUserId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid user ID format',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
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
      .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, numericUserId)))
      .get();

    let liked = false;

    if (existingLike) {
      // Unlike if already liked
      await db
        .delete(Likes)
        .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, numericUserId)))
        .run();
      liked = false;
    } else {
      // Like if not already liked
      await db
        .insert(Likes)
        .values({
          sayingId,
          userId: numericUserId,
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
    console.error('Error toggling like status:', error);
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
