// seed-turso.mjs
import { createClient } from '@libsql/client';
import { readFile } from 'fs/promises';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get Turso credentials from environment
const REMOTE_DB_URL = process.env.ASTRO_DB_REMOTE_URL;
const TURSO_DB_AUTH_TOKEN = process.env.ASTRO_DB_APP_TOKEN;

// Validate credentials are available
if (!REMOTE_DB_URL || !TURSO_DB_AUTH_TOKEN) {
  console.error('Error: Missing Turso database credentials.');
  console.error('Make sure ASTRO_DB_REMOTE_URL and ASTRO_DB_APP_TOKEN are set in your .env file.');
  process.exit(1);
}

// Connect to Turso database
const db = createClient({
  url: REMOTE_DB_URL,
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
  console.log(`Using database URL: ${REMOTE_DB_URL}`);

  try {
    // Get seed data
    const seedData = await getSeedData();

    // Begin transaction
    const tx = await db.transaction();

    try {
      // Create Types table if it doesn't exist
      console.log('Creating Types table if needed...');
      await tx.execute(
        'CREATE TABLE IF NOT EXISTS Types (id INTEGER PRIMARY KEY, name TEXT NOT NULL, createdAt TEXT NOT NULL)'
      );

      // Create Intros table if it doesn't exist
      console.log('Creating Intros table if needed...');
      await tx.execute(
        'CREATE TABLE IF NOT EXISTS Intros (id INTEGER PRIMARY KEY, introText TEXT NOT NULL, createdAt TEXT NOT NULL)'
      );

      // Create Users table if it doesn't exist
      console.log('Creating Users table if needed...');
      await tx.execute(
        'CREATE TABLE IF NOT EXISTS Users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, image TEXT, provider TEXT NOT NULL, lastLogin TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, role TEXT NOT NULL, preferences TEXT NOT NULL)'
      );

      // Create Sayings table if it doesn't exist
      console.log('Creating Sayings table if needed...');
      await tx.execute(
        'CREATE TABLE IF NOT EXISTS Sayings (id INTEGER PRIMARY KEY, intro INTEGER NOT NULL REFERENCES Intros(id), type INTEGER NOT NULL REFERENCES Types(id), firstKind TEXT NOT NULL, secondKind TEXT NOT NULL, userId TEXT REFERENCES Users(id), createdAt TEXT NOT NULL)'
      );

      // Create Likes table if it doesn't exist
      console.log('Creating Likes table if needed...');
      await tx.execute(
        'CREATE TABLE IF NOT EXISTS Likes (id INTEGER PRIMARY KEY, userId TEXT NOT NULL REFERENCES Users(id), sayingId INTEGER NOT NULL REFERENCES Sayings(id), createdAt TEXT NOT NULL, UNIQUE(userId, sayingId))'
      );

      // Seed Intros table
      console.log('Seeding Intros table...');
      for (const intro of seedData.intros) {
        await tx.execute({
          sql: 'INSERT OR IGNORE INTO Intros (id, introText, createdAt) VALUES (?, ?, ?)',
          args: [intro.id, intro.introText, new Date().toISOString()],
        });
      }

      // Create a default type if needed
      console.log('Creating default type...');
      await tx.execute({
        sql: 'INSERT OR IGNORE INTO Types (id, name, createdAt) VALUES (?, ?, ?)',
        args: [1, 'General', new Date().toISOString()],
      });

      // Seed Sayings table using existing type (Animals)
      console.log('Seeding Sayings table...');
      for (const saying of seedData.sayings) {
        await tx.execute({
          sql: 'INSERT OR IGNORE INTO Sayings (id, intro, type, firstKind, secondKind, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          args: [
            saying.id,
            saying.intro,
            1, // Use the "Animals" type
            saying.firstKind,
            saying.secondKind,
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
