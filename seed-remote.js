// seed-remote.js
import { db, Intros, Leads, Sayings } from 'astro:db';
import seedData from './seed-data.json';

// Function to seed data
async function seedDatabase() {
  try {
    console.log('Starting to seed remote database...');

    console.log('Seeding Intros table...');
    for (const intro of seedData.intros) {
      await db.insert(Intros).values({
        id: intro.id,
        introText: intro.introText,
        createdAt: new Date(),
      });
    }
    console.log('Intros seeded successfully!');

    console.log('Seeding Leads table...');
    for (const lead of seedData.leads) {
      await db.insert(Leads).values({
        id: lead.id,
        leadText: lead.leadText,
        createdAt: new Date(),
      });
    }
    console.log('Leads seeded successfully!');

    console.log('Seeding Sayings table...');
    for (const saying of seedData.sayings) {
      await db.insert(Sayings).values({
        id: saying.id,
        firstLead: saying.firstLead,
        secondLead: saying.secondLead,
        firstKind: saying.firstKind,
        secondKind: saying.secondKind,
        intro: saying.intro,
        createdAt: new Date(),
      });
    }
    console.log('Sayings seeded successfully!');

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    console.error('Error details:', error.stack);
  }
}

// Run the seeding function
seedDatabase();
