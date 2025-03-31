/**
 * Direct seeding script that doesn't rely on astro:db
 * Run with: node db/seed-db.mjs
 */
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get database path
const DB_PATH = process.env.ASTRO_DATABASE_FILE || '.astro/db.sqlite';
const dbPath = path.resolve(path.join(__dirname, '..', DB_PATH));

console.log(`Seeding database at: ${dbPath}`);

// Check if DB file exists
if (!fs.existsSync(dbPath)) {
  console.log('Creating new database file');
  // Ensure the directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Touch the file
  fs.writeFileSync(dbPath, '');
}

// Create database client
const db = createClient({
  url: `file:${dbPath}`
});

// Create tables if they don't exist
async function setupSchema() {
  console.log('Setting up database schema...');
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      image TEXT,
      provider TEXT DEFAULT 'unknown',
      role TEXT DEFAULT 'user',
      lastLogin TEXT,
      preferences TEXT,
      createdAt TEXT,
      updatedAt TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Intros (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      introText TEXT,
      createdAt TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      createdAt TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Sayings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      intro INTEGER,
      type INTEGER,
      firstKind TEXT,
      secondKind TEXT,
      userId INTEGER,
      createdAt TEXT,
      updatedAt TEXT,
      FOREIGN KEY (intro) REFERENCES Intros(id),
      FOREIGN KEY (type) REFERENCES Types(id),
      FOREIGN KEY (userId) REFERENCES Users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS Likes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER,
      sayingId INTEGER,
      createdAt TEXT,
      FOREIGN KEY (userId) REFERENCES Users(id),
      FOREIGN KEY (sayingId) REFERENCES Sayings(id)
    )
  `);
}

// Seed the database
async function seedDatabase() {
  console.log('Starting to seed database...');
  
  // Always clear the existing data to ensure a clean slate
  try {
    await db.execute('DELETE FROM Sayings');
    await db.execute('DELETE FROM Likes');
    await db.execute('DELETE FROM Types');
    await db.execute('DELETE FROM Intros');
    await db.execute('DELETE FROM Users');
    console.log('Cleared existing data');
  } catch (error) {
    console.error('Error clearing data:', error);
  }
  
  // Insert system user
  const now = new Date().toISOString();
  
  // Simply create a user with ID 1
  let systemUserId = 1; // Explicitly use ID 1
  try {
    await db.execute({
      sql: `
        INSERT INTO Users (id, name, email, provider, lastLogin, role, preferences, createdAt, updatedAt)
        VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: ['System', 'system@twokindsof.com', 'system', now, 'system', '{}', now, now]
    });
    console.log(`Created system user with ID: ${systemUserId}`);
  } catch (error) {
    console.error('Error creating system user:', error);
    throw error; // If we can't create a user, we should stop
  }
  
  // Insert intros
  const intros = [
    { introText: 'There are two kinds of', createdAt: now },
    { introText: 'In this world, there are two kinds of', createdAt: now },
    { introText: 'You can divide everything into two kinds of', createdAt: now },
  ];
  
  const introIds = [];
  for (const intro of intros) {
    const result = await db.execute({
      sql: 'INSERT INTO Intros (introText, createdAt) VALUES (?, ?)',
      args: [intro.introText, intro.createdAt]
    });
    introIds.push(result.lastInsertRowid);
  }
  console.log(`Created ${introIds.length} intros`);
  
  // Insert types
  const types = [
    { name: 'people', createdAt: now },
    { name: 'dogs', createdAt: now },
    { name: 'refrigerators', createdAt: now },
  ];
  
  const typeIds = [];
  for (const type of types) {
    const result = await db.execute({
      sql: 'INSERT INTO Types (name, createdAt) VALUES (?, ?)',
      args: [type.name, type.createdAt]
    });
    typeIds.push(result.lastInsertRowid);
  }
  console.log(`Created ${typeIds.length} types`);
  
  // Insert sayings
  const sayings = [
    {
      intro: introIds[0],
      type: typeIds[0],
      firstKind: 'eat pizza with a fork',
      secondKind: 'eat pizza with their hands',
      userId: systemUserId,
      createdAt: now,
      updatedAt: now,
    },
    {
      intro: introIds[1],
      type: typeIds[1],
      firstKind: 'bark at everything',
      secondKind: 'are quiet and observant',
      userId: systemUserId,
      createdAt: now,
      updatedAt: now,
    },
    {
      intro: introIds[2],
      type: typeIds[2],
      firstKind: 'have ice makers',
      secondKind: "don't have ice makers",
      userId: systemUserId,
      createdAt: now,
      updatedAt: now,
    },
  ];
  
  const sayingIds = [];
  for (const saying of sayings) {
    const result = await db.execute({
      sql: `
        INSERT INTO Sayings (intro, type, firstKind, secondKind, userId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        saying.intro,
        saying.type,
        saying.firstKind,
        saying.secondKind,
        saying.userId,
        saying.createdAt,
        saying.updatedAt
      ]
    });
    sayingIds.push(result.lastInsertRowid);
  }
  console.log(`Created ${sayingIds.length} sayings`);
  
  console.log('Database seeded successfully');
}

// Run the schema and seed functions
async function main() {
  try {
    await setupSchema();
    await seedDatabase();
    
    // Display counts
    const users = await db.execute('SELECT COUNT(*) as count FROM Users');
    const intros = await db.execute('SELECT COUNT(*) as count FROM Intros');
    const types = await db.execute('SELECT COUNT(*) as count FROM Types');
    const sayings = await db.execute('SELECT COUNT(*) as count FROM Sayings');
    
    console.log('Database status:');
    console.log(`- Users: ${users.rows[0].count}`);
    console.log(`- Intros: ${intros.rows[0].count}`);
    console.log(`- Types: ${types.rows[0].count}`);
    console.log(`- Sayings: ${sayings.rows[0].count}`);
    
    console.log('Setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  } finally {
    // Close the database connection
    await db.close();
  }
}

main();