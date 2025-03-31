// Simple script to seed the database
// Run this after astro db push has created the schema

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, Sayings, Intros, Types, Users } from 'astro:db';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seedDatabase() {
  console.log('Starting to seed Astro database...');
  
  try {
    // Create system user
    const now = new Date();
    const systemUser = await db.insert(Users).values({
      name: 'System',
      email: 'system@twokindsof.com',
      provider: 'system',
      role: 'system',
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
      preferences: {},
    }).returning().get();
    
    console.log('Created system user:', systemUser.id);
    
    // Create intros
    const intros = await db.insert(Intros).values([
      { introText: 'There are two kinds of', createdAt: now },
      { introText: 'In this world, there are two kinds of', createdAt: now },
      { introText: 'You can divide everything into two kinds of', createdAt: now },
    ]).returning();
    
    console.log(`Created ${intros.length} intros`);
    
    // Create types
    const types = await db.insert(Types).values([
      { name: 'people', createdAt: now },
      { name: 'dogs', createdAt: now },
      { name: 'refrigerators', createdAt: now },
    ]).returning();
    
    console.log(`Created ${types.length} types`);
    
    // Create sayings
    const sayings = await db.insert(Sayings).values([
      {
        intro: intros[0].id,
        type: types[0].id,
        firstKind: 'eat pizza with a fork',
        secondKind: 'eat pizza with their hands',
        userId: systemUser.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        intro: intros[1].id,
        type: types[1].id,
        firstKind: 'bark at everything',
        secondKind: 'are quiet and observant',
        userId: systemUser.id,
        createdAt: now,
        updatedAt: now,
      },
      {
        intro: intros[2].id,
        type: types[2].id,
        firstKind: 'have ice makers',
        secondKind: "don't have ice makers",
        userId: systemUser.id,
        createdAt: now,
        updatedAt: now,
      },
    ]).returning();
    
    console.log(`Created ${sayings.length} sayings`);
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}

// Run the seed function
seedDatabase();