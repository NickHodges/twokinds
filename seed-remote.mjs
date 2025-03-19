// seed-remote.mjs (using .mjs extension for ES modules)
?
import { db, Sayings, Users, Intros, Types } from 'astro:db';
import { readFile } from 'fs/promises';
import { eq } from 'astro:db';

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
  const systemUser = await db.select().from(Users)
    .where(eq(Users.email, 'system@twokindsof.com'))
    .get();

  if (!systemUser) {
    const now = new Date();
    const newUser = await db.insert(Users).values({
      name: 'System User',
      email: 'system@twokindsof.com',
      provider: 'system',
      lastLogin: now,
      createdAt: now,
      updatedAt: now,
      role: 'system',
      preferences: {},
    }).returning().get();

    return newUser;
  }

  return systemUser;
}

// Function to seed Intros
async function seedIntros(intros) {
  console.log('Seeding Intros...');
  for (const intro of intros) {
    const existingIntro = await db.select().from(Intros)
      .where(eq(Intros.introText, intro.introText))
      .get();

    if (!existingIntro) {
      await db.insert(Intros).values({
        introText: intro.introText,
        createdAt: new Date(),
      }).run();
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
    const existingType = await db.select().from(Types)
      .where(eq(Types.name, type.name))
      .get();

    if (!existingType) {
      await db.insert(Types).values({
        name: type.name,
        createdAt: new Date(),
      }).run();
    }
  }
}

// Main function to seed the database
export default async function seedDatabase() {
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
    const animalsType = await db.select().from(Types)
      .where(eq(Types.name, 'Animals'))
      .get();

    if (!animalsType) {
      throw new Error('Animals type not found');
    }

    // Seed Sayings
    console.log('Seeding Sayings...');
    for (const saying of seedData.sayings) {
      // Check if saying already exists
      const existingSaying = await db.select().from(Sayings)
        .where(eq(Sayings.firstKind, saying.firstKind))
        .where(eq(Sayings.secondKind, saying.secondKind))
        .get();

      if (!existingSaying) {
        await db.insert(Sayings).values({
          intro: saying.intro,
          type: animalsType.id,
          firstKind: saying.firstKind,
          secondKind: saying.secondKind,
          userId: systemUser.id,
          createdAt: new Date(),
        }).run();
      }
    }

    console.log('✅ Database seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

