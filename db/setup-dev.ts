/**
 * Development database setup script
 * This script can be run directly with `astro db execute db/setup-dev.ts`
 */
import { db, Sayings, Types, Intros, Users } from 'astro:db';
import seed from './seed';

async function setup() {
  console.log('Setting up development database...');

  try {
    // Check if database is empty
    const usersExist = await db
      .select()
      .from(Users)
      .then((users) => users.length > 0);

    if (!usersExist) {
      console.log('No users found. Seeding database...');
      await seed();
      console.log('Database seeded successfully');
    } else {
      console.log('Database already contains data, skipping seed');
    }

    // Show database stats
    const userCount = await db
      .select()
      .from(Users)
      .then((users) => users.length);
    const sayingsCount = await db
      .select()
      .from(Sayings)
      .then((sayings) => sayings.length);
    const introsCount = await db
      .select()
      .from(Intros)
      .then((intros) => intros.length);
    const typesCount = await db
      .select()
      .from(Types)
      .then((types) => types.length);

    console.log('Database status:');
    console.log(`- Users: ${userCount}`);
    console.log(`- Sayings: ${sayingsCount}`);
    console.log(`- Intros: ${introsCount}`);
    console.log(`- Types: ${typesCount}`);

    return true;
  } catch (error) {
    console.error('Error setting up development database:', error);
    throw error;
  }
}

// Execute when run directly
if (import.meta.url === import.meta.env?.ASTRO_ENTRY_URL) {
  setup()
    .then(() => {
      console.log('Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

export default setup;
