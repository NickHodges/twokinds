// seed-remote.mjs (using .mjs extension for ES modules)
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { readFile } from 'fs/promises';

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

// Function to get or create system user
async function getSystemUser() {
  const { rows: systemUsers } = await client.execute(
    'SELECT * FROM Users WHERE email = ?',
    ['system@twokindsof.com']
  );

  if (systemUsers.length === 0) {
    const now = new Date().toISOString();
    const { rows: newUser } = await client.execute(
      `INSERT INTO Users (id, name, email, provider, lastLogin, createdAt, updatedAt, role, preferences)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`,
      [
        'system-user-' + Date.now(),
        'System User',
        'system@twokindsof.com',
        'system',
        now,
        now,
        now,
        'system',
        '{}'
      ]
    );

    return newUser[0];
  }

  return systemUsers[0];
}

// Function to seed Intros
async function seedIntros(intros) {
  console.log('Seeding Intros...');
  for (const intro of intros) {
    const { rows: existingIntros } = await client.execute(
      'SELECT * FROM Intros WHERE introText = ?',
      [intro.introText]
    );

    if (existingIntros.length === 0) {
      await client.execute(
        'INSERT INTO Intros (introText, createdAt) VALUES (?, ?)',
        [intro.introText, new Date().toISOString()]
      );
    }
  }
}

// Function to seed Types
async function seedTypes() {
  console.log('Seeding Types...');
  const types = [
    { name: 'Animals' },
    { name: 'Food' },
    { name: 'Technology' },
    { name: 'Lifestyle' },
    { name: 'Personality' },
  ];

  for (const type of types) {
    const { rows: existingTypes } = await client.execute(
      'SELECT * FROM Types WHERE name = ?',
      [type.name]
    );

    if (existingTypes.length === 0) {
      await client.execute(
        'INSERT INTO Types (name, createdAt) VALUES (?, ?)',
        [type.name, new Date().toISOString()]
      );
    }
  }
}

// Main function to seed the database
async function seedDatabase() {
  console.log('Starting to seed database...');

  try {
    // Get or create system user
    const systemUser = await getSystemUser();
    console.log('Using system user:', systemUser.id);

    // Get seed data
    const seedData = await getSeedData();

    // Seed Intros and Types first
    await seedIntros(seedData.intros);
    await seedTypes();

    // Get the Animals type ID
    const { rows: animalsTypes } = await client.execute(
      'SELECT * FROM Types WHERE name = ?',
      ['Animals']
    );

    if (animalsTypes.length === 0) {
      throw new Error('Animals type not found');
    }

    const animalsType = animalsTypes[0];

    // Seed Sayings
    console.log('Seeding Sayings...');
    for (const saying of seedData.sayings) {
      // Check if saying already exists
      const { rows: existingSayings } = await client.execute(
        'SELECT * FROM Sayings WHERE firstKind = ? AND secondKind = ?',
        [saying.firstKind, saying.secondKind]
      );

      if (existingSayings.length === 0) {
        await client.execute(
          'INSERT INTO Sayings (intro, type, firstKind, secondKind, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [
            saying.intro,
            animalsType.id,
            saying.firstKind,
            saying.secondKind,
            systemUser.id,
            new Date().toISOString()
          ]
        );
      }
    }

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Execute the main function
seedDatabase().catch(console.error);

