import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import authConfig from '../../../../auth.config';
import { getUserIdFromSession, updateUserPreferences } from '../../../utils/user-db';
import type { UserPreferences } from '../../../utils/user-db';

export const POST: APIRoute = async ({ request }) => {
  try {
    const session = await getSession(request, authConfig);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const userId = getUserIdFromSession(session);
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 400,
      });
    }

    const preferences = (await request.json()) as UserPreferences;
    const updatedUser = await updateUserPreferences(userId, preferences);

    if (!updatedUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
      });
    }

    return new Response(JSON.stringify({ preferences: updatedUser.preferences }));
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
};
