import { db, Users, sql } from 'astro:db';
import type { ExtendedSession } from '../env';

/**
 * Creates or updates a user in the database based on their session information
 * @param session The user's session from auth.js
 * @returns The user object from the database
 */
export async function upsertUser(session: ExtendedSession | null) {
  if (!session?.user) return null;

  // Debug log the entire session structure
  console.log('[User DB] Full session:', JSON.stringify(session, null, 2));

  // Try to find the user ID from various possible locations
  const userId =
    session.user.id || session.user.sub || session.sub || session.userId || session.user?.sub;

  const { name, email, image } = session.user;

  if (!userId) {
    console.error('[User DB] No valid user identifier found in session. User:', {
      id: session.user.id,
      sub: session.user.sub,
      sessionSub: session.sub,
      sessionUserId: session.userId,
      email,
    });
    return null;
  }

  console.log('[User DB] Upserting user:', { userId, email });

  // Determine the provider from the session
  const provider = session.account?.provider?.toString() || 'unknown';

  const now = new Date();

  try {
    // Check if user exists
    const existingUser = await db
      .select()
      .from(Users)
      .where(sql`${Users.id} = ${userId}`)
      .get();

    if (existingUser) {
      // Update existing user
      await db
        .update(Users)
        .set({
          name: name || null,
          email: email || null,
          image: image || null,
          lastLogin: now,
          updatedAt: now,
          provider,
        })
        .where(sql`${Users.id} = ${userId}`)
        .run();
    } else {
      // Create new user
      await db
        .insert(Users)
        .values({
          id: userId,
          name: name || null,
          email: email || null,
          image: image || null,
          provider,
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
          role: 'user',
          preferences: {},
        })
        .run();
    }

    return await db
      .select()
      .from(Users)
      .where(sql`${Users.id} = ${userId}`)
      .get();
  } catch (error) {
    console.error('[User DB] Error upserting user:', error);
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
    console.error('[User DB] Error getting user by ID:', error);
    return null;
  }
}

/**
 * Gets a user from the database by their email
 * @param email The user's email
 * @returns The user object from the database
 */
export async function getUserByEmail(email: string) {
  try {
    return await db
      .select()
      .from(Users)
      .where(sql`${Users.email} = ${email}`)
      .get();
  } catch (error) {
    console.error('[User DB] Error getting user by email:', error);
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
  id: string,
  preferences: { theme?: 'light' | 'dark' | 'system'; emailNotifications?: boolean }
) {
  try {
    await db
      .update(Users)
      .set({
        preferences,
        updatedAt: new Date(),
      })
      .where(sql`${Users.id} = ${id}`)
      .run();

    return await db
      .select()
      .from(Users)
      .where(sql`${Users.id} = ${id}`)
      .get();
  } catch (error) {
    console.error('[User DB] Error updating user preferences:', error);
    return null;
  }
}

/**
 * Updates a user's role
 * @param id The user's ID
 * @param role The user's new role
 * @returns The updated user object
 */
export async function updateUserRole(id: string, role: 'user' | 'admin') {
  try {
    await db
      .update(Users)
      .set({
        role,
        updatedAt: new Date(),
      })
      .where(sql`${Users.id} = ${id}`)
      .run();

    return await db
      .select()
      .from(Users)
      .where(sql`${Users.id} = ${id}`)
      .get();
  } catch (error) {
    console.error('[User DB] Error updating user role:', error);
    return null;
  }
}
