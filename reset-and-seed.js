import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';

// Load environment variables
dotenv.config();

// Create Turso client with HTTPS URL
const client = createClient({
  url: 'https://twokinds-navynudge.turso.io',
  authToken:
    'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDM0OTg3NTAsImlkIjoiZmM3OTcwNGMtZjI3Zi00ZmRmLTk0NGQtNzg2M2RlOGUyOWM4IiwicmlkIjoiYzljMmU0N2ItNTQxMy00ZWFjLWE3YjItYjA2MTkxZmNlMzZjIn0.3Plbhsxp2jrg4HBHT7xd2WqfHJKfCMzE2XQXUiFh6H5eVaTK5xHJ4rjNbWTqJhTHNc1oojAwNb9V3DBVXV21Aw',
});

async function getSeedData() {
  try {
    const data = await readFile('./seed-data.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading seed data:', error);
    process.exit(1);
  }
}

async function resetAndSeedDatabase() {
  console.log('Starting database reset and seed...');

  try {
    // Drop all tables
    console.log('Dropping existing tables...');
    await client.execute('DROP TABLE IF EXISTS Likes');
    await client.execute('DROP TABLE IF EXISTS Sayings');
    await client.execute('DROP TABLE IF EXISTS Types');
    await client.execute('DROP TABLE IF EXISTS Intros');
    await client.execute('DROP TABLE IF EXISTS Users');

    // Create tables with correct schema
    console.log('Creating tables with correct schema...');

    // Users table
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

    // Intros table
    await client.execute(`
      CREATE TABLE Intros (
        id INTEGER PRIMARY KEY,
        introText TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Types table
    await client.execute(`
      CREATE TABLE Types (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Sayings table
    await client.execute(`
      CREATE TABLE Sayings (
        id INTEGER PRIMARY KEY,
        intro INTEGER NOT NULL REFERENCES Intros(id),
        type INTEGER NOT NULL REFERENCES Types(id),
        firstKind TEXT NOT NULL,
        secondKind TEXT NOT NULL,
        userId INTEGER REFERENCES Users(id),
        createdAt TEXT NOT NULL
      )
    `);

    // Likes table
    await client.execute(`
      CREATE TABLE Likes (
        id INTEGER PRIMARY KEY,
        userId INTEGER NOT NULL REFERENCES Users(id),
        sayingId INTEGER NOT NULL REFERENCES Sayings(id),
        createdAt TEXT NOT NULL,
        UNIQUE(userId, sayingId)
      )
    `);

    // Get seed data
    const seedData = await getSeedData();

    // Create system user
    console.log('Creating system user...');
    const now = new Date().toISOString();
    const {
      rows: [systemUser],
    } = await client.execute(
      `INSERT INTO Users (name, email, provider, lastLogin, createdAt, updatedAt, role, preferences)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      ['System User', 'system@twokindsof.com', 'system', now, now, now, 'system', '{}']
    );
    console.log('System user created with ID:', systemUser.id);

    // Seed Intros
    console.log('Seeding Intros...');
    const introMap = new Map();
    for (const intro of seedData.intros) {
      const {
        rows: [newIntro],
      } = await client.execute(
        'INSERT INTO Intros (introText, createdAt) VALUES (?, ?) RETURNING *',
        [intro.introText, now]
      );
      introMap.set(intro.id, newIntro.id);
    }

    // Seed Types
    console.log('Seeding Types...');
    const types = [
      { name: 'Animals' },
      { name: 'Food' },
      { name: 'Technology' },
      { name: 'Lifestyle' },
      { name: 'Personality' },
    ];

    const typeMap = new Map();
    for (const type of types) {
      const {
        rows: [newType],
      } = await client.execute('INSERT INTO Types (name, createdAt) VALUES (?, ?) RETURNING *', [
        type.name,
        now,
      ]);
      typeMap.set(type.name, newType.id);
    }

    // Seed Sayings
    console.log('Seeding Sayings...');
    for (const saying of seedData.sayings) {
      await client.execute(
        'INSERT INTO Sayings (intro, type, firstKind, secondKind, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
        [
          introMap.get(saying.intro),
          typeMap.get('Lifestyle'),
          saying.firstKind,
          saying.secondKind,
          systemUser.id,
          now,
        ]
      );
    }

    console.log('✅ Database reset and seeded successfully!');
  } catch (error) {
    console.error('❌ Error resetting and seeding database:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute the main function
resetAndSeedDatabase().catch(console.error);
