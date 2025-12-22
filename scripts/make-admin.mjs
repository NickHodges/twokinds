import { db, Users, eq } from 'astro:db';

async function makeAdmin() {
  const email = 'nickhodges@gmail.com';

  try {
    console.log(`Looking for user with email: ${email}...`);

    // Check if user exists
    const user = await db.select().from(Users).where(eq(Users.email, email)).get();

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.log('Please make sure the user has logged in at least once.');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (ID: ${user.id})`);
    console.log(`Current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('✓ User is already an admin!');
      return;
    }

    // Update user role to admin
    console.log('Updating user role to admin...');
    await db
      .update(Users)
      .set({ role: 'admin' })
      .where(eq(Users.email, email));

    console.log('✓ Successfully assigned admin role!');
    console.log(`✓ ${user.name} is now an admin.`);

  } catch (error) {
    console.error('Error assigning admin role:', error);
    throw error;
  }
}

export default makeAdmin;
