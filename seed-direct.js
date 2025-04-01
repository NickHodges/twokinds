import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import { readFile } from 'fs/promises';

// Load environment variables
dotenv.config();

// Create Turso client with direct configuration
const client = createClient({
  url: 'https://twokinds-navynudge.turso.io',
  authToken:
    'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDIyOTE5NDAsImlkIjoiYTQwODA2NDAtNjE0Yy00ZmNmLWI4ODYtYTA1ODQ1ODM4ZGU5IiwicmlkIjoiYTRhMzE4YTEtNDEwNC00YjA2LWE1NjgtMzYzZWUwMzBjOTQ1In0.RdwH0FAS5udr7vGbcYQNqMP6z-XyH8Gf8zhk2bHKvIfPyPu_jb48gAOiRoatRhI5CUCqrxNqpLqd8k1E5omgCg',
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

async function seedDatabase() {
  console.log('Starting to seed database...');

  try {
    // Get seed data
    const seedData = await getSeedData();

    // Create system user
    console.log('Creating system user...');
    const { rows: systemUsers } = await client.execute('SELECT * FROM Users WHERE email = ?', [
      'system@twokindsof.com',
    ]);

    let systemUserId;
    if (systemUsers.length === 0) {
      const now = new Date().toISOString();
      const { rows: newUser } = await client.execute(
        `INSERT INTO Users (name, email, provider, lastLogin, createdAt, updatedAt, role, preferences)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
        ['System User', 'system@twokindsof.com', 'system', now, now, now, 'system', '{}']
      );
      systemUserId = newUser[0].id;
    } else {
      systemUserId = systemUsers[0].id;
    }
    console.log('System user ID:', systemUserId);

    // Seed Intros
    console.log('Seeding Intros...');
    const introMap = new Map();
    for (const intro of seedData.intros) {
      const { rows: existingIntros } = await client.execute(
        'SELECT * FROM Intros WHERE introText = ?',
        [intro.introText]
      );

      if (existingIntros.length === 0) {
        const { rows: newIntro } = await client.execute(
          'INSERT INTO Intros (introText, createdAt) VALUES (?, ?) RETURNING *',
          [intro.introText, new Date().toISOString()]
        );
        introMap.set(intro.introText, newIntro[0].id);
      } else {
        introMap.set(intro.introText, existingIntros[0].id);
      }
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
      const { rows: existingTypes } = await client.execute('SELECT * FROM Types WHERE name = ?', [
        type.name,
      ]);

      if (existingTypes.length === 0) {
        const { rows: newType } = await client.execute(
          'INSERT INTO Types (name, createdAt) VALUES (?, ?) RETURNING *',
          [type.name, new Date().toISOString()]
        );
        typeMap.set(type.name, newType[0].id);
      } else {
        typeMap.set(type.name, existingTypes[0].id);
      }
    }

    // Seed Sayings
    console.log('Seeding Sayings...');
    for (const saying of seedData.sayings) {
      const { rows: existingSayings } = await client.execute(
        'SELECT * FROM Sayings WHERE firstKind = ? AND secondKind = ?',
        [saying.firstKind, saying.secondKind]
      );

      if (existingSayings.length === 0) {
        // Find the matching intro by text
        const matchingIntro = seedData.intros.find((i) => i.id === saying.intro);
        if (!matchingIntro) {
          console.error(
            `No matching intro found for saying: ${saying.firstKind} / ${saying.secondKind}`
          );
          continue;
        }

        await client.execute(
          'INSERT INTO Sayings (intro, type, firstKind, secondKind, userId, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [
            introMap.get(matchingIntro.introText),
            typeMap.get('Lifestyle'),
            saying.firstKind,
            saying.secondKind,
            systemUserId,
            new Date().toISOString(),
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
