import type { APIRoute } from 'astro';
import { getSession } from 'auth-astro/server';
import authConfig from '../../../../auth.config';
import { getUserIdFromSession, updateUserPreferences } from '../../../utils/user-db';
import type { UserPreferences } from '../../../utils/user-db';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('User Preferences API');

export const POST: APIRoute = async ({ request }) => {
  logger.debug('User preferences API called');

  try {
    const session = await getSession(request, authConfig);
    if (!session?.user) {
      logger.warn('Unauthenticated preferences update attempt');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    const userId = getUserIdFromSession(session);
    if (!userId) {
      logger.error('Invalid user ID in session', { sessionUserId: session.user.id });
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 400,
      });
    }

    const preferences = (await request.json()) as UserPreferences;
    logger.debug('Updating user preferences', { userId, preferences });

    const updatedUser = await updateUserPreferences(userId, preferences);

    if (!updatedUser) {
      logger.error('User not found when updating preferences', { userId });
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
      });
    }

    logger.info('Successfully updated user preferences', { userId });
    return new Response(JSON.stringify({ preferences: updatedUser.preferences }));
  } catch (error) {
    logger.error('Error updating user preferences', { error });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
    });
  }
};
