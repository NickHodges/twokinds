/**
 * Direct seeding script
 * 
 * Run this after starting the Astro dev server:
 * node seed-direct.mjs
 */
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = '.astro/db.sqlite';
const dbPath = path.resolve(path.join(__dirname, DB_PATH));

console.log(`Seeding database at: ${dbPath}`);

// Check if DB file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`);
  console.error('Make sure to start the Astro dev server first');
  process.exit(1);
}

// Create database client
const db = createClient({
  url: `file:${dbPath}`
});

async function seedDatabase() {
  try {
    // Clear existing data first
    console.log('Clearing existing data...');
    await db.execute('DELETE FROM "Sayings"');
    await db.execute('DELETE FROM "Likes"');
    await db.execute('DELETE FROM "Types"');
    await db.execute('DELETE FROM "Intros"');
    await db.execute('DELETE FROM "Users"');
    
    console.log('Adding seed data...');
    
    // Insert system user with ID 1
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO "Users" (id, name, email, provider, role, lastLogin, createdAt, updatedAt, preferences)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['System', 'system@twokindsof.com', 'system', 'system', now, now, now, '{}']
    });
    
    // Insert intros
    await db.execute({
      sql: `INSERT INTO "Intros" (id, introText, createdAt)
            VALUES (1, ?, ?), (2, ?, ?), (3, ?, ?)`,
      args: [
        'There are two kinds of', now,
        'In this world, there are two kinds of', now,
        'You can divide everything into two kinds of', now
      ]
    });
    
    // Insert types
    await db.execute({
      sql: `INSERT INTO "Types" (id, name, createdAt)
            VALUES (1, ?, ?), (2, ?, ?), (3, ?, ?)`,
      args: [
        'people', now,
        'dogs', now,
        'refrigerators', now
      ]
    });
    
    // Insert sayings
    await db.execute({
      sql: `INSERT INTO "Sayings" (intro, type, firstKind, secondKind, userId, createdAt, updatedAt)
            VALUES 
              (1, 1, ?, ?, 1, ?, ?),
              (2, 2, ?, ?, 1, ?, ?),
              (3, 3, ?, ?, 1, ?, ?)`,
      args: [
        'eat pizza with a fork', 'eat pizza with their hands', now, now,
        'bark at everything', 'are quiet and observant', now, now,
        'have ice makers', "don't have ice makers", now, now
      ]
    });
    
    console.log('Seed completed successfully!');
    
    // Verify data
    const usersCount = await db.execute('SELECT COUNT(*) as count FROM "Users"');
    const introsCount = await db.execute('SELECT COUNT(*) as count FROM "Intros"');
    const typesCount = await db.execute('SELECT COUNT(*) as count FROM "Types"');
    const sayingsCount = await db.execute('SELECT COUNT(*) as count FROM "Sayings"');
    
    console.log('Database now contains:');
    console.log(`- Users: ${usersCount.rows[0].count}`);
    console.log(`- Intros: ${introsCount.rows[0].count}`);
    console.log(`- Types: ${typesCount.rows[0].count}`);
    console.log(`- Sayings: ${sayingsCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await db.close();
  }
}

seedDatabase();