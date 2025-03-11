// seed-remote.mjs (using .mjs extension for ES modules)
import { readFile } from 'fs/promises';
import { createClient } from '@libsql/client';

// Function to get seed data
async function getSeedData() {
  const data = await readFile('./seed-data.json', 'utf8');
  return JSON.parse(data);
}

// Function to seed data
async function seedDatabase() {
  try {
    // Check for environment variables
    const dbUrl = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_DB_AUTH_TOKEN;

    if (!dbUrl || !authToken) {
      console.error(
        'Error: TURSO_DB_URL or TURSO_DB_AUTH_TOKEN environment variables are not set.'
      );
      console.error(
        'Please run with: TURSO_DB_URL=your_url TURSO_DB_AUTH_TOKEN=your_token node seed-remote.mjs'
      );
      process.exit(1);
    }

    console.log('Starting to seed remote database...');

    // Create Turso client
    const client = createClient({
      url: dbUrl,
      authToken: authToken,
    });

    // Get seed data
    const seedData = await getSeedData();

    // Begin transaction
    const transaction = await client.transaction();

    try {
      console.log('Seeding Intros table...');
      for (const intro of seedData.intros) {
        await transaction.execute({
          sql: 'INSERT OR IGNORE INTO Intros (id, introText, createdAt) VALUES (?, ?, ?)',
          args: [intro.id, intro.introText, new Date().toISOString()],
        });
      }

      console.log('Seeding Leads table...');
      for (const lead of seedData.leads) {
        await transaction.execute({
          sql: 'INSERT OR IGNORE INTO Leads (id, leadText, createdAt) VALUES (?, ?, ?)',
          args: [lead.id, lead.leadText, new Date().toISOString()],
        });
      }

      console.log('Seeding Sayings table...');
      for (const saying of seedData.sayings) {
        await transaction.execute({
          sql: 'INSERT OR IGNORE INTO Sayings (id, firstLead, secondLead, firstKind, secondKind, intro, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
          args: [
            saying.id,
            saying.firstLead,
            saying.secondLead,
            saying.firstKind,
            saying.secondKind,
            saying.intro,
            new Date().toISOString(),
          ],
        });
      }

      // Commit the transaction
      await transaction.commit();
      console.log('Database seeded successfully!');
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      console.error('Error during seeding, transaction rolled back:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();
