import { db, Intros, Leads, Sayings, Users, eq } from 'astro:db';

export default async function seed() {
  // Check if system user exists first
  const existingSystemUser = await db.select().from(Users).where(eq(Users.id, 'system')).get();

  if (!existingSystemUser) {
    // Create system user only if it doesn't exist
    await db.insert(Users).values({
      id: 'system',
      name: 'System',
      email: 'system@twokindsof.com',
      provider: 'system',
      role: 'system',
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
    });
  }

  // Seed the Intros table with some sample data
  const introResults = await db
    .insert(Intros)
    .values([
      { introText: 'There are two kinds of people in the world...' },
      { introText: "In life, you'll meet two types of people..." },
      { introText: 'People can be divided into two categories...' },
      { introText: 'The world has exactly two types of people...' },
      { introText: 'Humanity consists of two distinct groups...' },
    ])
    .returning();

  // Seed the Leads table with lead-in phrases
  const leadResults = await db
    .insert(Leads)
    .values([
      { leadText: 'People who...' },
      { leadText: 'Folks who...' },
      { leadText: 'Those who...' },
      { leadText: 'The people who...' },
      { leadText: 'Individuals who...' },
      { leadText: 'The ones who...' },
    ])
    .returning();

  // Seed the Sayings table with some example sayings
  await db.insert(Sayings).values([
    {
      intro: introResults[0].id,
      firstLead: leadResults[0].id,
      secondLead: leadResults[2].id,
      firstKind: 'put their shopping cart back',
      secondKind: 'leave it in the parking lot',
      userId: 'system',
    },
    {
      intro: introResults[1].id,
      firstLead: leadResults[1].id,
      secondLead: leadResults[1].id,
      firstKind: 'eat the pizza crust',
      secondKind: 'leave it on the plate',
      userId: 'system',
    },
    {
      intro: introResults[2].id,
      firstLead: leadResults[2].id,
      secondLead: leadResults[2].id,
      firstKind: 'reply to emails right away',
      secondKind: 'let them sit in their inbox for days',
      userId: 'system',
    },
  ]);
}
