// seed-turso.mjs
import { createClient } from '@libsql/client';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get Turso credentials from environment
const TURSO_DB_URL = process.env.TURSO_DB_URL;
const TURSO_DB_AUTH_TOKEN = process.env.TURSO_DB_AUTH_TOKEN;

// Validate credentials are available
if (!TURSO_DB_URL || !TURSO_DB_AUTH_TOKEN) {
  console.error('Error: Missing Turso database credentials.');
  console.error('Make sure TURSO_DB_URL and TURSO_DB_AUTH_TOKEN are set in your .env file.');
  process.exit(1);
}

// Connect to Turso database
const db = createClient({
  url: TURSO_DB_URL,
  authToken: TURSO_DB_AUTH_TOKEN,
});

// Function to get seed data from JSON file
async function getSeedData() {
  try {
    const data = await readFile('./seed-data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading seed data:', error);
    process.exit(1);
  }
}

// Main function to seed the database
async function seedTursoDatabase() {
  console.log('Starting to seed Turso database...');
  console.log(`Using database URL: ${TURSO_DB_URL}`);

  try {
    // Get seed data
    const seedData = await getSeedData();

    // Begin transaction
    const tx = await db.transaction();

    try {
      // Seed Intros table
      console.log('Seeding Intros table...');
      for (const intro of seedData.intros) {
        await tx.execute({
          sql: 'INSERT OR IGNORE INTO Intros (id, introText, createdAt) VALUES (?, ?, ?)',
          args: [intro.id, intro.introText, new Date().toISOString()],
        });
      }

      // Seed Leads table
      console.log('Seeding Leads table...');
      for (const lead of seedData.leads) {
        await tx.execute({
          sql: 'INSERT OR IGNORE INTO Leads (id, leadText, createdAt) VALUES (?, ?, ?)',
          args: [lead.id, lead.leadText, new Date().toISOString()],
        });
      }

      // Seed Sayings table
      console.log('Seeding Sayings table...');
      for (const saying of seedData.sayings) {
        await tx.execute({
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

      // Commit transaction
      await tx.commit();
      console.log('✅ Database seeded successfully!');
    } catch (error) {
      // Rollback on error
      await tx.rollback();
      console.error('❌ Error during seeding, transaction rolled back:', error);
      throw error;
    }
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the seeding function
seedTursoDatabase();
