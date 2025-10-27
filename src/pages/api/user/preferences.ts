import type { APIRoute } from 'astro';
import { getUserIdFromSession, updateUserPreferences } from '../../../utils/user-db';
import type { UserPreferences } from '../../../utils/user-db';
import { createLogger } from '../../../utils/logger';

const logger = createLogger('User Preferences API');

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  logger.debug('User preferences API called');

  try {
    // Get user session from locals (set by middleware)
    const session = locals.session;
    if (!session?.user) {
      logger.warn('Unauthenticated preferences update attempt');
      return redirect('/auth/signin?error=login-required', 302);
    }

    const userId = getUserIdFromSession(session);
    if (!userId) {
      logger.error('Invalid user ID in session', { sessionUserId: session.user.id });
      return redirect('/profile?error=invalid-user', 302);
    }

    // Get form data
    const formData = await request.formData();
    const preferences: UserPreferences = {
      theme: (formData.get('theme') as 'light' | 'dark' | 'system') || 'system',
      emailNotifications: formData.get('emailNotifications') === 'true',
    };

    logger.debug('Updating user preferences', { userId, preferences });

    const updatedUser = await updateUserPreferences(userId, preferences);

    if (!updatedUser) {
      logger.error('User not found when updating preferences', { userId });
      return redirect('/profile?error=user-not-found', 302);
    }

    logger.info('Successfully updated user preferences', { userId });
    return redirect('/profile?success=preferences-saved', 302);
  } catch (error) {
    logger.error('Error updating user preferences', { error });
    return redirect('/profile?error=save-failed', 302);
  }
};
