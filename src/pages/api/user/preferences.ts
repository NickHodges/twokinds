import type { APIRoute } from 'astro';
import { updateUserPreferences } from '../../../utils/user-db';

export const POST: APIRoute = async ({ request, locals }) => {
  // Check if user is authenticated
  if (!locals.session?.user?.id) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Parse the request body
    const body = await request.json();
    const { preferences } = body;

    if (!preferences) {
      return new Response(JSON.stringify({ error: 'Preferences are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the user's preferences
    const updatedUser = await updateUserPreferences(locals.session.user.id, preferences);

    if (!updatedUser) {
      return new Response(JSON.stringify({ error: 'Failed to update preferences' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return the updated user
    return new Response(JSON.stringify({ success: true, user: updatedUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating preferences:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
