import { db, Users, Sayings, Likes, isNull } from 'astro:db';

/**
 * Utility script to check and fix user ID issues
 * This script:
 * 1. Shows all user IDs and their types
 * 2. Creates a system user if needed
 * 3. Shows all linked sayings and likes
 */
export default async function diagnose() {
  try {
    console.log('=== DATABASE USER ID DIAGNOSIS ===');
    
    // Step 1: Check all users
    const allUsers = await db.select().from(Users).all();
    console.log(`\nFound ${allUsers.length} users in the database`);
    
    allUsers.forEach(user => {
      console.log(`User ID: ${user.id} (${typeof user.id}) - Email: ${user.email}`);
    });
    
    // Step 2: Check all sayings and their user IDs
    const allSayings = await db.select().from(Sayings).all();
    console.log(`\nFound ${allSayings.length} sayings in the database`);
    
    const sayingCounts = allSayings.reduce((acc, saying) => {
      const key = String(saying.userId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Sayings per user ID:');
    Object.entries(sayingCounts).forEach(([userId, count]) => {
      console.log(`- User ID ${userId}: ${count} sayings`);
    });
    
    // Step 3: Check for null user IDs in sayings
    const nullSayings = allSayings.filter(saying => saying.userId === null);
    console.log(`\nSayings with null user ID: ${nullSayings.length}`);
    
    // Step 4: Check likes
    const allLikes = await db.select().from(Likes).all();
    console.log(`\nFound ${allLikes.length} likes in the database`);
    
    const likeCounts = allLikes.reduce((acc, like) => {
      const key = String(like.userId);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Likes per user ID:');
    Object.entries(likeCounts).forEach(([userId, count]) => {
      console.log(`- User ID ${userId}: ${count} likes`);
    });
    
    // Step 5: Create system user if needed
    let systemUser = allUsers.find(user => user.email === 'system@twokindsof.com');
    
    if (!systemUser) {
      console.log('\nCreating system user...');
      const now = new Date();
      systemUser = await db
        .insert(Users)
        .values({
          name: 'System',
          email: 'system@twokindsof.com',
          provider: 'system',
          role: 'system',
          lastLogin: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
        .get();
      
      console.log(`Created system user with ID: ${systemUser.id}`);
    } else {
      console.log(`\nSystem user exists with ID: ${systemUser.id}`);
    }
    
    // Step 6: Fix null sayings
    if (nullSayings.length > 0) {
      console.log(`\nUpdating ${nullSayings.length} sayings with null user ID to use system user ID (${systemUser.id})...`);
      
      const updated = await db
        .update(Sayings)
        .set({ userId: systemUser.id })
        .where(isNull(Sayings.userId))
        .returning()
        .all();
      
      console.log(`Updated ${updated.length} sayings`);
    }
    
    console.log('\n=== DIAGNOSIS COMPLETE ===');
  } catch (error) {
    console.error('Error during database diagnosis:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  diagnose();
}