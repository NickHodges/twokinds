import { db, Users, sql, eq } from 'astro:db';
import type { ExtendedSession, Session } from '../env';
import { createLogger } from './logger';

const logger = createLogger('User DB');

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  // Add other preferences as needed
}

export interface UserData {
  id: string;
  name: string;
  email: string;
  image: string | null;
  provider: string;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  role: string;
  preferences: UserPreferences;
}

/**
 * Creates or updates a user in the database based on their session information
 * @param session The user's session from auth.js
 * @returns The user object from the database
 */
export async function upsertUser(session: ExtendedSession | null) {
  if (!session?.user) return null;

  // Debug log the entire session structure
  logger.debug('Full session:', session);

  // Try to find the user ID from various possible locations
  const userId =
    session.user.id || session.user.sub || session.sub || session.userId || session.user?.sub;

  const { name, email, image } = session.user;

  if (!userId || !email) {
    logger.error('No valid user identifier or email found in session. User:', {
      id: session.user.id,
      sub: session.user.sub,
      sessionSub: session.sub,
      sessionUserId: session.userId,
      email,
    });
    return null;
  }
  
  // Validate the user ID to prevent issues with database queries
  // Additional safety check for serverless environments

  // Convert userId to string if it's a number
  const userIdString = userId.toString();

  logger.info('Upserting user:', { userId: userIdString, email });

  // Determine the provider from the session
  const provider = session.account?.provider?.toString() || 'unknown';

  const now = new Date();

  try {
    // First check if user exists by email
    const existingUserByEmail = await db.select().from(Users).where(eq(Users.email, email)).get();

    if (existingUserByEmail) {
      // Update existing user
      await db
        .update(Users)
        .set({
          name: name || null,
          image: image || null,
          lastLogin: now,
          updatedAt: now,
          provider,
        })
        .where(eq(Users.email, email))
        .run();

      return existingUserByEmail;
    } else {
      // Create new user
      const newUser = await db
        .insert(Users)
        .values({
          id: userIdString,
          name: name || null,
          email: email,
          image: image || null,
          provider,
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
          role: 'user',
          preferences: {},
        })
        .returning()
        .get();

      return newUser;
    }
  } catch (error) {
    logger.error('Error upserting user:', error);
    return null;
  }
}

/**
 * Gets a user from the database by their ID
 * @param id The user's ID
 * @returns The user object from the database
 */
export async function getUserById(id: string) {
  try {
    return await db
      .select()
      .from(Users)
      .where(sql`${Users.id} = ${id}`)
      .get();
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Gets a user from the database by their email
 * @param email The user's email
 * @returns The user object from the database
 */
export async function getUserByEmail(email: string): Promise<UserData | null> {
  try {
    return await db.select().from(Users).where(eq(Users.email, email)).get();
  } catch (error) {
    logger.error('Error getting user by email:', error);
    return null;
  }
}

/**
 * Updates a user's preferences
 * @param id The user's ID
 * @param preferences The user's preferences
 * @returns The updated user object
 */
export async function updateUserPreferences(
  userId: string,
  preferences: UserPreferences
): Promise<UserData | null> {
  try {
    const user = await db.select().from(Users).where(eq(Users.id, userId)).get();
    if (!user) return null;

    const updatedPreferences = { ...user.preferences, ...preferences };
    const now = new Date();

    const updatedUser = await db
      .update(Users)
      .set({
        preferences: updatedPreferences,
        updatedAt: now,
      })
      .where(eq(Users.id, userId))
      .returning()
      .get();

    return updatedUser;
  } catch (error) {
    logger.error('Error updating user preferences:', error);
    return null;
  }
}

/**
 * Updates a user's role
 * @param id The user's ID
 * @param role The user's new role
 * @returns The updated user object
 */
export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin'
): Promise<UserData | null> {
  try {
    const updatedUser = await db
      .update(Users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(eq(Users.id, userId))
      .returning()
      .get();

    return updatedUser;
  } catch (error) {
    logger.error('Error updating user role:', error);
    return null;
  }
}

export function getUserIdFromSession(session: Session | null): string | null {
  if (!session?.user) return null;
  const userId = session.user.id;
  return userId ? userId.toString() : null;
}

export async function getUser(userId: string): Promise<UserData | null> {
  try {
    const user = await db.select().from(Users).where(eq(Users.id, userId)).get();
    return user;
  } catch (error) {
    logger.error('Error getting user:', error);
    return null;
  }
}
