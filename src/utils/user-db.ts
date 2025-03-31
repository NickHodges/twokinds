import { db, Users, eq } from 'astro:db';
import type { User } from 'auth-astro/dist/types';

/**
 * Utility to get a user's database ID from session information
 * This handles the mapping between session user IDs (which could be UUIDs from OAuth)
 * and our database's numeric IDs
 */
export async function getUserDbId(user: User | { id?: string | number, email?: string }): Promise<number | null> {
  try {
    // Exit early if no user
    if (!user) {
      console.error('No user provided to getUserDbId');
      return null;
    }
    
    console.log('Looking up database ID for user:', { 
      providedId: user.id, 
      email: user.email 
    });
    
    // First try by email (most reliable way)
    if (user.email) {
      const dbUser = await db
        .select()
        .from(Users)
        .where(eq(Users.email, user.email))
        .get()
        .catch(err => {
          console.error('Error finding user by email:', err);
          return null;
        });
      
      if (dbUser) {
        console.log('Found user by email with database ID:', dbUser.id);
        return dbUser.id;
      }
    }
    
    // If we get here, we couldn't find the user
    console.error('Could not find user in database');
    return null;
  } catch (error) {
    console.error('Error in getUserDbId:', error);
    return null;
  }
}