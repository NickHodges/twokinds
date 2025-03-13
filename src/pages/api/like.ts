import type { APIRoute } from 'astro';
import { db, Likes, Users, Sayings, eq, and } from 'astro:db';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const session = locals.session;
    if (!session?.user?.id) {
      console.error('No user ID in session');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { sayingId } = await request.json();
    if (!sayingId) {
      console.error('No sayingId provided');
      return new Response(JSON.stringify({ error: 'Missing sayingId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing like request:', {
      userId: session.user.id,
      sayingId: sayingId,
    });

    // Verify user exists
    const user = await db.select().from(Users).where(eq(Users.id, session.user.id)).get();

    if (!user) {
      // If user doesn't exist, create them
      await db.insert(Users).values({
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || null,
        image: session.user.image || null,
        provider: 'github',
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('Created new user:', session.user.id);
    } else {
      console.log('User found:', user.id);
    }

    // Verify saying exists
    const saying = await db.select().from(Sayings).where(eq(Sayings.id, sayingId)).get();

    if (!saying) {
      console.error('Saying not found:', sayingId);
      return new Response(JSON.stringify({ error: 'Saying not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Saying found:', saying.id);

    // Check if the user has already liked this saying
    const existingLike = await db
      .select()
      .from(Likes)
      .where(and(eq(Likes.userId, session.user.id), eq(Likes.sayingId, sayingId)))
      .get();

    if (existingLike) {
      console.log('Removing existing like:', existingLike.id);
      // Unlike: Delete the like record
      await db.delete(Likes).where(eq(Likes.id, existingLike.id));
      return new Response(JSON.stringify({ liked: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      console.log('Creating new like for user', session.user.id, 'on saying', sayingId);
      // Like: Create a new like record
      const result = await db
        .insert(Likes)
        .values({
          userId: session.user.id,
          sayingId: sayingId,
          createdAt: new Date(),
        })
        .returning();
      console.log('Like created:', result);

      return new Response(JSON.stringify({ liked: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error in like endpoint:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
