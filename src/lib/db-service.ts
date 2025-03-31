import { db, Sayings, Intros, Types, Likes, eq, desc, and, count } from 'astro:db';
import type { Saying } from '../types/saying';

/**
 * Get a complete saying with all related data by ID
 *
 * @param id The ID of the saying to retrieve
 * @returns The saying with intro and type data, or null if not found
 */
export async function getSayingById(id: number) {
  try {
    // Get the saying record
    const sayingResults = await db.select().from(Sayings).where(eq(Sayings.id, id));

    // If no results, return null
    if (!sayingResults || sayingResults.length === 0) {
      console.log(`No saying found with ID: ${id}`);
      return null;
    }

    const saying = sayingResults[0];

    // Get the related intro
    const introResults = await db.select().from(Intros).where(eq(Intros.id, saying.intro));

    // Get the related type
    const typeResults = await db.select().from(Types).where(eq(Types.id, saying.type));

    // Combine the data
    return {
      ...saying,
      introText: introResults[0]?.introText || 'Unknown intro',
      typeName: typeResults[0]?.name || 'Unknown type',
    };
  } catch (error) {
    console.error('Error getting saying by ID:', error);
    return null;
  }
}

/**
 * Get all sayings with related data
 *
 * @returns Array of sayings with intro and type data
 */
export async function getAllSayings(): Promise<Saying[]> {
  const rawSayings = await db.select().from(Sayings).orderBy(desc(Sayings.createdAt));

  // Get the related data for each saying
  const sayingsWithData = await Promise.all(
    rawSayings.map(async (saying) => {
      const [intro, type] = await Promise.all([
        db
          .select()
          .from(Intros)
          .where(eq(Intros.id, saying.intro))
          .get(),
        db
          .select()
          .from(Types)
          .where(eq(Types.id, saying.type))
          .get(),
      ]);

      return {
        id: String(saying.id),
        intro: String(saying.intro),
        type: String(saying.type),
        firstKind: saying.firstKind,
        secondKind: saying.secondKind,
        userId: String(saying.userId),
        createdAt: saying.createdAt,
        introText: intro?.introText || '',
        typeName: type?.name || '',
        intro_data: intro
          ? {
              id: String(intro.id),
              introText: intro.introText,
            }
          : undefined,
        type_data: type
          ? {
              id: String(type.id),
              name: type.name,
            }
          : undefined,
      };
    })
  );

  return sayingsWithData;
}

export async function getUserSayings(userId: string): Promise<Saying[]> {
  // Validate userId to prevent potential issues with Number conversion
  const userIdNum = Number(userId);
  if (!userId || !Number.isFinite(userIdNum)) {
    console.error(`Invalid user ID: ${userId}`);
    return [];
  }

  // First, get all sayings for the user
  const rawSayings = await db
    .select()
    .from(Sayings)
    .where(eq(Sayings.userId, userIdNum))
    .orderBy(Sayings.createdAt);

  // Get liked status and total likes for each saying
  const likedStatus = new Map<number, boolean>();
  const totalLikes = new Map<number, number>();

  for (const saying of rawSayings) {
    // Get total likes for this saying
    const likesResult = await db
      .select({ value: count() })
      .from(Likes)
      .where(eq(Likes.sayingId, saying.id))
      .get();
    totalLikes.set(saying.id, likesResult?.value || 0);

    // Get liked status
    const like = await db
      .select()
      .from(Likes)
      .where(and(eq(Likes.userId, Number(userId)), eq(Likes.sayingId, saying.id)))
      .get();
    likedStatus.set(saying.id, !!like);
  }

  // Then, get the related data for each saying
  const sayingsWithData = await Promise.all(
    rawSayings.map(async (saying) => {
      const [intro, type] = await Promise.all([
        db
          .select()
          .from(Intros)
          .where(eq(Intros.id, saying.intro))
          .get(),
        db
          .select()
          .from(Types)
          .where(eq(Types.id, saying.type))
          .get(),
      ]);

      return {
        id: String(saying.id),
        intro: String(saying.intro),
        type: String(saying.type),
        firstKind: saying.firstKind,
        secondKind: saying.secondKind,
        userId: String(saying.userId),
        createdAt: saying.createdAt,
        introText: intro?.introText || '',
        typeName: type?.name || '',
        intro_data: intro
          ? {
              id: String(intro.id),
              introText: intro.introText,
            }
          : undefined,
        type_data: type
          ? {
              id: String(type.id),
              name: type.name,
            }
          : undefined,
        isLiked: likedStatus.get(saying.id) || false,
        totalLikes: totalLikes.get(saying.id) || 0,
      };
    })
  );

  return sayingsWithData;
}
