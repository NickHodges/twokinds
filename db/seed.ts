import { db, Intros, Leads, Sayings } from 'astro:db';

export default async function seed() {
  // Seed the Intros table with some sample data
  const intros = await db
    .insert(Intros)
    .values([
      { introText: 'There are two kinds of people in the world...' },
      { teintroTextxt: "In life, you'll meet two types of people..." },
      { introText: 'People can be divided into two categories...' },
      { introText: 'The world has exactly two types of people...' },
      { introText: 'Humanity consists of two distinct groups...' },
    ])
    .returning();

  // Seed the Leads table with lead-in phrases
  const leads = await db
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
      intro: intros[0].id,
      firstLead: leads[0].id,
      secondLead: leads[2].id,
      firstKind: 'put their shopping cart back',
      secondKind: 'leave it in the parking lot',
    },
    {
      intro: intros[1].id,
      firstLead: leads[1].id,
      secondLead: leads[1].id,
      firstKind: 'eat the pizza crust',
      secondKind: 'leave it on the plate',
    },
    {
      intro: intros[2].id,
      firstLead: leads[2].id,
      secondLead: leads[2].id,
      firstKind: 'reply to emails right away',
      secondKind: 'let them sit in their inbox for days',
    },
  ]);
}
