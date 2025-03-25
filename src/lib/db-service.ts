import type { Saying } from '../types/saying';
import type { DBSaying, DBIntro, DBType } from '../types/db';

// Create a wrapper function that safely handles the database queries
// This will handle potential import issues in serverless environments
async function safeDbQuery<T>(queryFn: () => Promise<T>, fallbackValue: T): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Cannot find module') ||
        error.message.includes('ERR_UNSUPPORTED_ESM_URL_SCHEME'))
    ) {
      console.warn('Database module not available in this environment, using fallback data');
      return fallbackValue;
    }
    console.error('Error executing database query:', error);
    return fallbackValue;
  }
}

/**
 * Get a complete saying with all related data by ID
 *
 * @param id The ID of the saying to retrieve
 * @returns The saying with intro and type data, or null if not found
 */
export async function getSayingById(id: number) {
  return safeDbQuery(async () => {
    // In a real implementation, these imports would be at the top of the file
    // We're moving them inside the function to handle potential import errors
    const { db, Sayings, Intros, Types, eq } = await import('astro:db');

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
  }, null);
}

/**
 * Get all sayings with related data
 *
 * @returns Array of sayings with intro and type data
 */
export async function getAllSayings(): Promise<Saying[]> {
  return safeDbQuery(async () => {
    // Import DB modules within the function for better error handling
    const { db, Sayings, Intros, Types, eq, desc } = await import('astro:db');

    const rawSayings = await db.select().from(Sayings).orderBy(desc(Sayings.createdAt));

    const sayings = rawSayings.map((saying) => ({
      id: saying.id.toString(),
      intro: saying.intro.toString(),
      type: saying.type.toString(),
      firstKind: saying.firstKind,
      secondKind: saying.secondKind,
      userId: saying.userId,
      createdAt: saying.createdAt,
    })) as DBSaying[];

    // Get the related data for each saying
    const sayingsWithData = await Promise.all(
      sayings.map(async (saying) => {
        const [intro, type] = await Promise.all([
          db
            .select()
            .from(Intros)
            .where(eq(Intros.id, Number(saying.intro)))
            .get() as Promise<DBIntro | undefined>,
          db
            .select()
            .from(Types)
            .where(eq(Types.id, Number(saying.type)))
            .get() as Promise<DBType | undefined>,
        ]);

        return {
          ...saying,
          introText: intro?.introText || '',
          typeName: type?.name || '',
          intro_data: intro
            ? {
                id: intro.id.toString(),
                introText: intro.introText,
              }
            : undefined,
          type_data: type
            ? {
                id: type.id.toString(),
                name: type.name,
              }
            : undefined,
        };
      })
    );

    return sayingsWithData;
  }, []);
}

export async function getUserSayings(userId: string): Promise<Saying[]> {
  return safeDbQuery(async () => {
    // Import DB modules within the function for better error handling
    const { db, Sayings, Intros, Types, Likes, eq, and, count } = await import('astro:db');

    // First, get all sayings for the user
    const rawSayings = await db
      .select()
      .from(Sayings)
      .where(eq(Sayings.userId, userId))
      .orderBy(Sayings.createdAt);

    const userSayings = rawSayings.map((saying) => ({
      id: saying.id.toString(),
      intro: saying.intro.toString(),
      type: saying.type.toString(),
      firstKind: saying.firstKind,
      secondKind: saying.secondKind,
      userId: saying.userId,
      createdAt: saying.createdAt,
    })) as DBSaying[];

    // Get liked status and total likes for each saying
    const likedStatus = new Map<string, boolean>();
    const totalLikes = new Map<string, number>();

    for (const saying of userSayings) {
      // Get total likes for this saying
      const likesResult = await db
        .select({ value: count() })
        .from(Likes)
        .where(eq(Likes.sayingId, Number(saying.id)))
        .get();
      totalLikes.set(saying.id, likesResult?.value || 0);

      // Get liked status
      const like = await db
        .select()
        .from(Likes)
        .where(and(eq(Likes.userId, userId), eq(Likes.sayingId, Number(saying.id))))
        .get();
      likedStatus.set(saying.id, !!like);
    }

    // Then, get the related data for each saying
    const sayingsWithData = await Promise.all(
      userSayings.map(async (saying) => {
        const [intro, type] = await Promise.all([
          db
            .select()
            .from(Intros)
            .where(eq(Intros.id, Number(saying.intro)))
            .get() as Promise<DBIntro | undefined>,
          db
            .select()
            .from(Types)
            .where(eq(Types.id, Number(saying.type)))
            .get() as Promise<DBType | undefined>,
        ]);

        return {
          ...saying,
          introText: intro?.introText || '',
          typeName: type?.name || '',
          intro_data: intro
            ? {
                id: intro.id.toString(),
                introText: intro.introText,
              }
            : undefined,
          type_data: type
            ? {
                id: type.id.toString(),
                name: type.name,
              }
            : undefined,
          isLiked: likedStatus.get(saying.id) || false,
          totalLikes: totalLikes.get(saying.id) || 0,
        };
      })
    );

    return sayingsWithData;
  }, []);
}
