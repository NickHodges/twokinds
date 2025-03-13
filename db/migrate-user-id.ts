import { db, Users, Sayings, eq } from 'astro:db';

export default async function migrate() {
  try {
    // First, ensure the system user exists
    const systemUser = await db.select().from(Users).where(eq(Users.id, 'system')).get();

    if (!systemUser) {
      await db.insert(Users).values({
        id: 'system',
        name: 'System',
        email: 'system@twokindsof.com',
        provider: 'system',
        role: 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
        lastLogin: new Date(),
      });
      console.log('Created system user');
    }

    // Update all existing sayings to have the system user ID
    await db.update(Sayings).set({ userId: 'system' }).where(eq(Sayings.userId, null));

    console.log('Updated existing sayings with system user ID');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrate();
