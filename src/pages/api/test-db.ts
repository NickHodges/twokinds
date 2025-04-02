import type { APIRoute } from 'astro';
import { db, Users } from 'astro:db';
import { createLogger } from '../../utils/logger';

const logger = createLogger('API/TestDB');

export const GET: APIRoute = async () => {
  try {
    // Check database connection by selecting count of users
    // Drizzle/Astro:DB doesn't expose a simple .count() in select,
    // so we fetch all IDs and count them, or rely on the query not throwing.
    // For a simple connection test, just trying to query is enough.
    await db.select({ id: Users.id }).from(Users).limit(1).get();

    return new Response(JSON.stringify({ message: 'Database connected successfully' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Type guard for error
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    logger.error('Database connection error:', errorMessage, error); // Log message and original error
    return new Response(
      JSON.stringify({ message: 'Database connection failed', error: errorMessage }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
