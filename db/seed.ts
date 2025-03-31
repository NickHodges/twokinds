import { db, Intros, Types, Users, Sayings } from 'astro:db';

// The main seed function that populates the database
export default async function seed() {
  try {
    console.log('Starting database seeding...');
    
    // Create system user with ID 1
    console.log('Creating system user...');
    // First, manually insert a user with ID 1
    const systemUser = {
      id: 1,
      name: 'System',
      email: 'system@twokindsof.com',
      provider: 'system',
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'system',
      preferences: {}
    };
    
    await db.insert(Users).values(systemUser);
    console.log('System user created with ID: 1');

    // Insert intros
    console.log('Creating intros...');
    const intros = await db
      .insert(Intros)
      .values([
        { introText: 'There are two kinds of', createdAt: new Date() },
        { introText: 'In this world, there are two kinds of', createdAt: new Date() },
        { introText: 'You can divide everything into two kinds of', createdAt: new Date() },
      ])
      .returning();
    
    const [intro1, intro2, intro3] = intros;
    console.log(`Created ${intros.length} intros`);

    // Insert types
    console.log('Creating types...');
    const types = await db
      .insert(Types)
      .values([
        { name: 'people', createdAt: new Date() },
        { name: 'dogs', createdAt: new Date() },
        { name: 'refrigerators', createdAt: new Date() },
      ])
      .returning();
    
    const [type1, type2, type3] = types;
    console.log(`Created ${types.length} types`);

    // Insert sayings
    console.log('Creating sayings...');
    const sayings = await db
      .insert(Sayings)
      .values([
        {
          intro: intro1.id,
          type: type1.id,
          firstKind: 'eat pizza with a fork',
          secondKind: 'eat pizza with their hands',
          userId: 1, // Fixed userId
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          intro: intro2.id,
          type: type2.id,
          firstKind: 'bark at everything',
          secondKind: 'are quiet and observant',
          userId: 1, // Fixed userId
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          intro: intro3.id,
          type: type3.id,
          firstKind: 'have ice makers',
          secondKind: 'don\'t have ice makers',
          userId: 1, // Fixed userId
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      .returning();
    
    console.log(`Created ${sayings.length} sayings`);
    console.log('Database seeding completed successfully');
    
    return true;
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

