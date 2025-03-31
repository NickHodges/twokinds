/**
 * Production database seeding script for local testing
 * This script seeds the production test database with initial data
 */
import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = '../.astro/prod-db.sqlite';
const dbPath = path.resolve(path.join(__dirname, DB_PATH));

console.log(`Seeding production test database at: ${dbPath}`);

// Check if DB file exists
if (!fs.existsSync(dbPath)) {
  console.error(`Database file not found: ${dbPath}`);
  console.error('Make sure to run the production build first');
  process.exit(1);
}

// Create database client
const db = createClient({
  url: `file:${dbPath}`
});

async function seedDatabase() {
  try {
    // Create schema if needed - should already be created by the build process
    // but we'll include it here for safety
    await createSchema();
    
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
    
    // Insert demo user with ID 2
    await db.execute({
      sql: `INSERT INTO "Users" (id, name, email, provider, role, lastLogin, createdAt, updatedAt, preferences)
            VALUES (2, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: ['Demo User', 'demo@example.com', 'credentials', 'user', now, now, now, '{}']
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
              (3, 3, ?, ?, 1, ?, ?),
              (1, 2, ?, ?, 2, ?, ?),
              (2, 1, ?, ?, 2, ?, ?)`,
      args: [
        'eat pizza with a fork', 'eat pizza with their hands', now, now,
        'bark at everything', 'are quiet and observant', now, now,
        'have ice makers', "don't have ice makers", now, now,
        'love playing fetch', 'prefer to cuddle', now, now,
        'wake up early', 'stay up late', now, now
      ]
    });
    
    console.log('Production test database seeded successfully!');
    
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

async function createSchema() {
  try {
    // These tables should already exist, but we'll check just in case
    const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = tables.rows.map(r => r.name);
    
    // Check if updatedAt column exists in Sayings table
    if (tableNames.includes('Sayings')) {
      const columns = await db.execute("PRAGMA table_info(Sayings)");
      const columnNames = columns.rows.map(r => r.name);
      
      if (!columnNames.includes('updatedAt')) {
        console.log('Adding missing updatedAt column to Sayings table...');
        await db.execute("ALTER TABLE Sayings ADD COLUMN updatedAt TEXT");
      }
    }
    
    if (!tableNames.includes('Users')) {
      console.log('Creating Users table...');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "Users" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "name" TEXT,
          "email" TEXT,
          "image" TEXT,
          "provider" TEXT DEFAULT 'unknown',
          "role" TEXT DEFAULT 'user',
          "lastLogin" TEXT,
          "preferences" TEXT,
          "createdAt" TEXT,
          "updatedAt" TEXT
        )
      `);
    }

    if (!tableNames.includes('Intros')) {
      console.log('Creating Intros table...');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "Intros" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "introText" TEXT,
          "createdAt" TEXT
        )
      `);
    }

    if (!tableNames.includes('Types')) {
      console.log('Creating Types table...');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "Types" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "name" TEXT,
          "createdAt" TEXT
        )
      `);
    }

    if (!tableNames.includes('Sayings')) {
      console.log('Creating Sayings table...');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "Sayings" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "intro" INTEGER,
          "type" INTEGER,
          "firstKind" TEXT,
          "secondKind" TEXT,
          "userId" INTEGER,
          "createdAt" TEXT,
          "updatedAt" TEXT,
          FOREIGN KEY ("intro") REFERENCES "Intros"("id"),
          FOREIGN KEY ("type") REFERENCES "Types"("id"),
          FOREIGN KEY ("userId") REFERENCES "Users"("id")
        )
      `);
    }

    if (!tableNames.includes('Likes')) {
      console.log('Creating Likes table...');
      await db.execute(`
        CREATE TABLE IF NOT EXISTS "Likes" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "userId" INTEGER,
          "sayingId" INTEGER,
          "createdAt" TEXT,
          FOREIGN KEY ("userId") REFERENCES "Users"("id"),
          FOREIGN KEY ("sayingId") REFERENCES "Sayings"("id")
        )
      `);
    }
  } catch (error) {
    console.error('Error creating schema:', error);
  }
}

seedDatabase();