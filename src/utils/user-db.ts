import { db, Users, eq } from 'astro:db';
import type { User } from 'auth-astro/dist/types';
import type { ExtendedSession, Session } from '../env';
import { createLogger } from './logger';

/**
 * Interface for user preferences
 */
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  emailNotifications?: boolean;
  [key: string]: unknown;
}

/**
 * User Database Utilities
 *
 * This module provides utilities for working with users in the database,
 * especially for handling the mismatch between Auth.js session UUIDs and
 * our database's numeric IDs.
 *
 * Key functions:
 * - getUserDbId: Looks up a user's numeric database ID by their email
 * - upsertUser: Ensures a user exists in the database with a numeric ID
 */
const logger = createLogger('UserDB');

/**
 * Utility to get a user's database ID from session information
 * This handles the mapping between session user IDs (which could be UUIDs from OAuth)
 * and our database's numeric IDs
 */
export async function getUserDbId(
  user: User | { id?: string | number; email?: string }
): Promise<number | null> {
  try {
    // Exit early if no user
    if (!user) {
      logger.error('No user provided to getUserDbId');
      return null;
    }

    logger.info('Looking up database ID for user:', {
      providedId: user.id,
      email: user.email,
    });

    // First try by email (most reliable way)
    if (user.email) {
      const dbUser = await db
        .select()
        .from(Users)
        .where(eq(Users.email, user.email))
        .get()
        .catch((err) => {
          logger.error('Error finding user by email:', err);
          return null;
        });

      if (dbUser) {
        // Check if the ID is valid
        if (dbUser.id === null || dbUser.id === undefined) {
          logger.error('Found user but ID is null or undefined. Attempting to fix...');

          try {
            // Try to fix by recreating the user
            // First delete the user with null ID
            await db.delete(Users).where(eq(Users.email, user.email)).run();

            // Then create a new user with proper autoincrement ID
            const now = new Date();
            const newUser = await db
              .insert(Users)
              .values({
                name: dbUser.name || user.name || '',
                email: user.email,
                image: dbUser.image || '',
                provider: dbUser.provider || 'oauth',
                role: dbUser.role || 'user',
                lastLogin: now,
                createdAt: now,
                updatedAt: now,
                preferences: dbUser.preferences || {},
              })
              .returning()
              .get();

            logger.info('Fixed user with null ID. New ID:', newUser.id);
            return newUser.id;
          } catch (fixError) {
            logger.error('Failed to fix user with null ID:', fixError);
            return null;
          }
        }

        logger.info('Found user by email with database ID:', dbUser.id);
        return dbUser.id;
      } else {
        // User doesn't exist, create it
        logger.info('User not found by email, creating new user');
        try {
          const now = new Date();
          const newUser = await db
            .insert(Users)
            .values({
              name: user.name || '',
              email: user.email,
              image: user.image || '',
              provider: 'oauth',
              role: 'user',
              lastLogin: now,
              createdAt: now,
              updatedAt: now,
              preferences: {},
            })
            .returning()
            .get();

          logger.info('Created new user with ID:', newUser.id);
          return newUser.id;
        } catch (createError) {
          logger.error('Error creating user during lookup:', createError);

          // Check if it's a unique constraint violation (user was created in a race condition)
          if (
            createError.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
            (createError.message && createError.message.includes('UNIQUE constraint failed'))
          ) {
            // Try one more time to get the user that was likely just created
            const conflictUser = await db
              .select()
              .from(Users)
              .where(eq(Users.email, user.email))
              .get()
              .catch(() => null);

            if (conflictUser && conflictUser.id !== null && conflictUser.id !== undefined) {
              logger.info('Found user after conflict with ID:', conflictUser.id);
              return conflictUser.id;
            }
          }

          return null;
        }
      }
    }

    // If we get here, we couldn't find the user
    logger.error('Could not find user in database');
    return null;
  } catch (error) {
    logger.error('Error in getUserDbId:', error);
    return null;
  }
}

/**
 * Upserts a user in the database
 * This ensures the user exists in our database with a proper numeric ID,
 * regardless of the OAuth provider's ID format
 */
export async function upsertUser(session: ExtendedSession): Promise<{
  id: number;
  name: string;
  email: string;
  image: string | null;
  provider: string;
  role: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  preferences: unknown;
} | null> {
  try {
    if (!session?.user) {
      logger.error('No user in session');
      return null;
    }

    const { user } = session;
    logger.info('Upserting user:', user.email);

    // Check if user exists
    const existingUser = await db
      .select()
      .from(Users)
      .where(eq(Users.email, user.email))
      .get()
      .catch((err) => {
        logger.error('Error finding user by email:', err);
        return null;
      });

    if (existingUser) {
      // Check if the existing user has a valid ID
      if (existingUser.id === null || existingUser.id === undefined) {
        logger.error('Existing user has null ID:', existingUser);

        // Try to recreate the user with a proper ID
        try {
          // First delete the user with null ID if possible
          await db
            .delete(Users)
            .where(eq(Users.email, user.email))
            .run()
            .catch((err) => {
              logger.error('Error deleting user with null ID:', err);
            });

          // Then create a new user record
          const now = new Date();
          const recreatedUser = await db
            .insert(Users)
            .values({
              name: user.name || existingUser.name || '',
              email: user.email,
              image: user.image || existingUser.image || '',
              provider: existingUser.provider || 'oauth',
              role: existingUser.role || 'user',
              lastLogin: now,
              createdAt: now,
              updatedAt: now,
              preferences: existingUser.preferences || {},
            })
            .returning()
            .get();

          logger.info('Recreated user with valid ID:', recreatedUser.id);
          return recreatedUser;
        } catch (recreateErr) {
          logger.error('Failed to recreate user with valid ID:', recreateErr);
          return null;
        }
      }

      // Update existing user with valid ID
      logger.info('Updating existing user:', existingUser.id);

      const updatedUser = await db
        .update(Users)
        .set({
          name: user.name || existingUser.name,
          image: user.image || existingUser.image,
          lastLogin: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(Users.id, existingUser.id))
        .returning()
        .get()
        .catch((err) => {
          logger.error('Error updating user:', err);
          throw err;
        });

      return updatedUser;
    } else {
      // Create new user
      logger.info('Creating new user');
      const now = new Date();

      const newUser = await db
        .insert(Users)
        .values({
          name: user.name || '',
          email: user.email,
          image: user.image || '',
          provider: 'oauth', // Auth.js doesn't provide the provider in the session
          role: 'user',
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
          preferences: {},
        })
        .returning()
        .get()
        .catch((err) => {
          logger.error('Error creating user:', err);
          throw err;
        });

      logger.info('Created new user with ID:', newUser.id);
      return newUser;
    }
  } catch (error) {
    logger.error('Error in upsertUser:', error);
    return null;
  }
}

/**
 * Get a user ID from a session
 *
 * @param session The user session
 * @returns The numeric user ID or null if not found
 */
export function getUserIdFromSession(session: Session | ExtendedSession | null): number | null {
  if (!session?.user?.id) {
    logger.error('No user ID in session');
    return null;
  }

  // Session user IDs are stored as numbers
  if (typeof session.user.id === 'number') {
    return session.user.id;
  }

  logger.error('Could not get numeric ID from session');
  return null;
}

/**
 * Update user preferences
 *
 * @param userId The numeric user ID
 * @param preferences The preferences to update
 * @returns The updated user or null if not found
 */
export async function updateUserPreferences(userId: number, preferences: UserPreferences) {
  try {
    logger.info('Updating preferences for user:', userId);

    // Find the user first to get existing preferences
    const user = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .get()
      .catch((err) => {
        logger.error('Error finding user:', err);
        return null;
      });

    if (!user) {
      logger.error('User not found:', userId);
      return null;
    }

    // Merge existing preferences with new ones
    const existingPrefs = user.preferences || {};
    const mergedPrefs = { ...existingPrefs, ...preferences };

    // Update the user
    const updatedUser = await db
      .update(Users)
      .set({
        preferences: mergedPrefs,
        updatedAt: new Date(),
      })
      .where(eq(Users.id, userId))
      .returning()
      .get()
      .catch((err) => {
        logger.error('Error updating user preferences:', err);
        return null;
      });

    if (!updatedUser) {
      logger.error('Failed to update user preferences');
      return null;
    }

    logger.info('Updated preferences for user:', userId);
    return updatedUser;
  } catch (error) {
    logger.error('Error in updateUserPreferences:', error);
    return null;
  }
}

/**
 * Get a user by ID
 *
 * @param userId The user ID (can be string or number)
 * @returns The user or null if not found
 */
export async function getUserById(userId: string | number) {
  try {
    logger.info('Getting user by ID:', userId);

    // Handle different ID formats
    let dbUserId: number | null = null;

    if (typeof userId === 'number') {
      // If it's already a number, use it directly
      dbUserId = userId;
    } else if (typeof userId === 'string') {
      // Try to parse as a number first
      const numericId = parseInt(userId, 10);
      if (!isNaN(numericId)) {
        dbUserId = numericId;
      } else {
        // Otherwise, try to look up by email if it looks like an email
        if (userId.includes('@')) {
          const userByEmail = await db
            .select()
            .from(Users)
            .where(eq(Users.email, userId))
            .get()
            .catch((err) => {
              logger.error('Error finding user by email:', err);
              return null;
            });

          if (userByEmail) {
            return userByEmail;
          }
        }

        // If we get here, we couldn't find the user
        logger.error('Could not find user with ID:', userId);
        return null;
      }
    }

    if (!dbUserId) {
      logger.error('Invalid user ID format:', userId);
      return null;
    }

    // Get the user from the database
    const user = await db
      .select()
      .from(Users)
      .where(eq(Users.id, dbUserId))
      .get()
      .catch((err) => {
        logger.error('Error finding user by ID:', err);
        return null;
      });

    if (!user) {
      logger.error('User not found with ID:', userId);
      return null;
    }

    logger.info('Found user by ID:', userId);
    return user;
  } catch (error) {
    logger.error('Error in getUserById:', error);
    return null;
  }
}
