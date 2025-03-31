import { db, Users, Sayings, Likes, eq, isNull } from 'astro:db';

/**
 * Migrate all user IDs - diagnosis script
 * This script handles:
 * 1. Creating a system user with numeric ID if it doesn't exist
 * 2. Displaying current database state for IDs
 */
export default async function migrate() {
  try {
    console.log('Starting user ID diagnosis...');
    
    // Step 1: Check current DB state
    const allUsers = await db.select().from(Users).all();
    console.log(`Found ${allUsers.length} users in the database`);
    
    allUsers.forEach(user => {
      console.log(`User ID: ${user.id} (${typeof user.id}) - Email: ${user.email}`);
    });
    
    // Step 2: Check sayings
    const allSayings = await db.select().from(Sayings).all();
    console.log(`\nFound ${allSayings.length} sayings in the database`);
    
    // Group by user ID
    const sayingsByUser = allSayings.reduce((acc, saying) => {
      const key = String(saying.userId);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(saying);
      return acc;
    }, {} as Record<string, typeof allSayings>);
    
    Object.entries(sayingsByUser).forEach(([userId, sayings]) => {
      console.log(`User ID: ${userId} has ${sayings.length} sayings`);
    });
    
    // Step 3: Check null sayings
    const nullSayings = allSayings.filter(saying => saying.userId === null);
    if (nullSayings.length > 0) {
      console.log(`\nWARNING: Found ${nullSayings.length} sayings with null userId`);
    }
    
    // Step 4: Check if DB structure is consistent
    console.log('\nChecking database structure consistency...');
    
    let systemUser = allUsers.find(user => user.email === 'system@twokindsof.com');
    
    if (!systemUser) {
      console.log('Creating system user...');
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
      
      console.log('Created system user with ID:', systemUser.id);
    } else {
      console.log('System user exists with ID:', systemUser.id);
    }
    
    if (nullSayings.length > 0) {
      console.log(`Updating ${nullSayings.length} sayings with null userId to use system user...`);
      const updated = await db
        .update(Sayings)
        .set({ userId: systemUser.id })
        .where(isNull(Sayings.userId))
        .returning()
        .all();
      
      console.log(`Updated ${updated.length} sayings`);
    }
    
    console.log('\nMigration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrate();
}