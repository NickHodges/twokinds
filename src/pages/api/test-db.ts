import type { APIRoute } from 'astro';
import { db } from 'astro:db';

export const GET: APIRoute = async () => {
  try {
    // Test the database connection by querying the Users table
    const users = await db.select().from('Users').all();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database connection successful',
        users: users,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Database connection error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Database connection failed',
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
