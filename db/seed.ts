import { db, Intros, Types, Users, Sayings } from 'astro:db';

export default async function seed() {
  // Create system user
  const [systemUser] = await db
    .insert(Users)
    .values({
      id: 'system',
      name: 'System',
      email: 'system@twokindsof.com',
      provider: 'system',
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      role: 'system',
      preferences: {},
    })
    .returning();

  // Insert intros
  const [intro1, intro2, intro3] = await db
    .insert(Intros)
    .values([
      { introText: 'There are two kinds of', createdAt: new Date() },
      { introText: 'In this world, there are two kinds of', createdAt: new Date() },
      { introText: 'You can divide everything into two kinds of', createdAt: new Date() },
    ])
    .returning();

  // Insert types
  const [type1, type2, type3] = await db
    .insert(Types)
    .values([
      { name: 'people', createdAt: new Date() },
      { name: 'dogs', createdAt: new Date() },
      { name: 'refrigerators', createdAt: new Date() },
    ])
    .returning();

  // Insert sayings
  await db.insert(Sayings).values([
    {
      intro: intro1.id,
      type: type1.id,
      firstKind: 'eat pizza with a fork',
      secondKind: 'eat pizza with their hands',
      userId: systemUser.id,
      createdAt: new Date(),
    },
    {
      intro: intro2.id,
      type: type2.id,
      firstKind: 'bark at everything',
      secondKind: 'are quiet and observant',
      userId: systemUser.id,
      createdAt: new Date(),
    },
    {
      intro: intro3.id,
      type: type3.id,
      firstKind: 'have ice makers',
      secondKind: 'don\'t have ice makers',
      userId: systemUser.id,
      createdAt: new Date(),
    },
  ]);
}