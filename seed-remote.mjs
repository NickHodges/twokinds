// seed-remote.mjs (using .mjs extension for ES modules)
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { readFile } from 'fs/promises';
import seedData from './seed-data.json' assert { type: 'json' };

// Load environment variables
dotenv.config();

// Get Turso credentials from environment
const REMOTE_DB_URL = process.env.ASTRO_DB_REMOTE_URL;
const TURSO_DB_AUTH_TOKEN = process.env.ASTRO_DB_APP_TOKEN;

if (!REMOTE_DB_URL || !TURSO_DB_AUTH_TOKEN) {
  console.error('Error: Database credentials not found in environment variables.');
  console.error('Make sure ASTRO_DB_REMOTE_URL and ASTRO_DB_APP_TOKEN are set in your .env file.');
  process.exit(1);
}

// Create Turso client
const client = createClient({
  url: REMOTE_DB_URL,
  authToken: TURSO_DB_AUTH_TOKEN,
});

async function resetDatabase() {
  console.log('Dropping existing tables...');
  await client.execute('DROP TABLE IF EXISTS Likes');
  await client.execute('DROP TABLE IF EXISTS Sayings');
  await client.execute('DROP TABLE IF EXISTS Types');
  await client.execute('DROP TABLE IF EXISTS Intros');
  await client.execute('DROP TABLE IF EXISTS Users');

  console.log('Creating tables with INTEGER primary keys...');

  // Create Users table with INTEGER primary key
  await client.execute(`
    CREATE TABLE Users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      image TEXT,
      provider TEXT NOT NULL,
      lastLogin TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      role TEXT NOT NULL,
      preferences TEXT NOT NULL
    )
  `);

  // Create Intros table
  await client.execute(`
    CREATE TABLE Intros (
      id INTEGER PRIMARY KEY,
      introText TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // Create Types table
  await client.execute(`
    CREATE TABLE Types (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // Create Sayings table
  await client.execute(`
    CREATE TABLE Sayings (
      id INTEGER PRIMARY KEY,
      intro INTEGER NOT NULL REFERENCES Intros(id),
      type INTEGER NOT NULL REFERENCES Types(id),
      firstKind TEXT NOT NULL,
      secondKind TEXT NOT NULL,
      userId INTEGER NOT NULL REFERENCES Users(id),
      createdAt TEXT NOT NULL
    )
  `);

  // Create Likes table
  await client.execute(`
    CREATE TABLE Likes (
      id INTEGER PRIMARY KEY,
      userId INTEGER NOT NULL REFERENCES Users(id),
      sayingId INTEGER NOT NULL REFERENCES Sayings(id),
      createdAt TEXT NOT NULL,
      UNIQUE(userId, sayingId)
    )
  `);
}

async function getOrCreateSystemUser() {
  try {
    // Try to get existing system user
    const result = await client.execute('SELECT * FROM Users WHERE email = ?', ['system@twokinds.com']);
    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Create system user if not exists with ID 1
    const now = new Date().toISOString();
    await client.execute(
      `INSERT INTO Users (id, name, email, image, provider, lastLogin, createdAt, updatedAt, role, preferences)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'System User',
        'system@twokinds.com',
        'https://avatars.githubusercontent.com/u/1234567',
        'system',
        now,
        now,
        now,
        'system',
        '{}'
      ]
    );
    return {
      id: 1,
      name: 'System User',
      email: 'system@twokinds.com',
      role: 'system',
      provider: 'system',
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
      preferences: {}
    };
  } catch (error) {
    console.error('Error getting/creating system user:', error);
    throw error;
  }
}

async function seedIntros() {
  console.log('Seeding Intros...');
  const now = new Date().toISOString();
  for (const intro of seedData.intros) {
    try {
      await client.execute(
        'INSERT INTO Intros (id, introText, createdAt) VALUES (?, ?, ?)',
        [intro.id, intro.introText, now]
      );
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log(`Intro ${intro.id} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }
  console.log('Intros seeded successfully');
}

async function seedTypes() {
  console.log('Seeding Types...');
  const now = new Date().toISOString();
  const types = ['Animals', 'Food', 'Technology', 'Lifestyle', 'Personality'];
  for (let i = 0; i < types.length; i++) {
    try {
      await client.execute(
        'INSERT INTO Types (id, name, createdAt) VALUES (?, ?, ?)',
        [i + 1, types[i], now]
      );
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log(`Type ${types[i]} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }
  console.log('Types seeded successfully');
}

async function seedSayings(systemUser) {
  console.log('Seeding Sayings...');
  const now = new Date().toISOString();
  for (const saying of seedData.sayings) {
    try {
      await client.execute(
        'INSERT INTO Sayings (id, intro, type, firstKind, secondKind, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [saying.id, saying.intro, 1, saying.firstKind, saying.secondKind, systemUser.id, now]
      );
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log(`Saying ${saying.id} already exists, skipping...`);
      } else {
        throw error;
      }
    }
  }
  console.log('Sayings seeded successfully');
}

async function main() {
  try {
    console.log('Starting database reset and seed...');

    // Reset database first
    await resetDatabase();
    console.log('Database reset complete');

    // Get or create system user first
    const systemUser = await getOrCreateSystemUser();
    console.log('System user ready:', systemUser.id);

    // Seed tables in correct order to maintain foreign key relationships
    await seedIntros();
    await seedTypes();
    await seedSayings(systemUser);

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

main();

