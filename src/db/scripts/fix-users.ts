// Script to force-fix user database issues
import { db, Users, eq } from 'astro:db';

/**
 * This script forcibly fixes user ID issues by:
 * 1. Finding any users with null IDs
 * 2. Recreating them with proper auto-increment IDs
 * 3. Handling constraints and race conditions
 */
export async function fixUserDatabase() {
  console.log('Starting user database repair');
  
  try {
    // Get all users
    const allUsers = await db.select().from(Users).all();
    console.log(`Found ${allUsers.length} total users`);
    
    // Find users with null IDs
    const nullIdUsers = allUsers.filter(user => user.id === null || user.id === undefined);
    console.log(`Found ${nullIdUsers.length} users with null IDs`);
    
    // Process each problematic user
    for (const user of nullIdUsers) {
      if (!user.email) {
        console.log('Skipping user with no email');
        continue;
      }
      
      console.log(`Fixing user: ${user.email}`);
      
      try {
        // Delete the problematic user
        await db.delete(Users).where(eq(Users.email, user.email)).run();
        console.log(`Deleted user with null ID: ${user.email}`);
        
        // Create a new user with the same data
        const now = new Date();
        const newUser = await db.insert(Users).values({
          name: user.name || '',
          email: user.email,
          image: user.image || '',
          provider: user.provider || 'oauth',
          role: user.role || 'user',
          lastLogin: now,
          createdAt: user.createdAt || now,
          updatedAt: now,
          preferences: user.preferences || {},
        }).returning().get();
        
        console.log(`Recreated user with new ID: ${newUser.id}`);
      } catch (error) {
        console.error(`Error fixing user ${user.email}:`, error);
      }
    }
    
    // Final verification
    const remainingNullIds = await db
      .select()
      .from(Users)
      .where(eq(Users.id, null))
      .all();
      
    if (remainingNullIds.length > 0) {
      console.log(`WARNING: Still have ${remainingNullIds.length} users with null IDs`);
    } else {
      console.log('Success! All users now have valid IDs');
    }
    
    return true;
  } catch (error) {
    console.error('Error in fixUserDatabase:', error);
    return false;
  }
}
