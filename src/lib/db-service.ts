import type { Saying } from '../types/saying';
import type { DBSaying, DBIntro, DBType } from '../types/db';
import { db, Sayings, Intros, Types, Likes, eq, and, desc, count } from 'astro:db';

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

    // Enhanced error reporting for database errors
    if (error instanceof Error) {
      console.error('Database Error Details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        // Log the full error object to see all available properties
        fullError: error,
        // Log the error as JSON to see all properties
        errorJson: JSON.stringify(error, Object.getOwnPropertyNames(error), 2),
      });
    }

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
    // First, get all sayings
    const sayings = await db.select().from(Sayings).orderBy(desc(Sayings.createdAt));

    // Get all intros and types in one query each
    const intros = await db.select().from(Intros);
    const types = await db.select().from(Types);

    // Create maps for quick lookups
    const introMap = new Map(intros.map((intro) => [intro.id, intro]));
    const typeMap = new Map(types.map((type) => [type.id, type]));

    // Log any missing relationships
    for (const saying of sayings) {
      if (!introMap.has(saying.intro)) {
        console.error(`Missing intro for saying ${saying.id}: intro=${saying.intro}`);
      }
      if (!typeMap.has(saying.type)) {
        console.error(`Missing type for saying ${saying.id}: type=${saying.type}`);
      }
    }

    // Combine the data
    return sayings.map((saying) => ({
      ...saying,
      introText: introMap.get(saying.intro)?.introText || '',
      typeName: typeMap.get(saying.type)?.name || '',
      intro_data: {
        id: saying.intro,
        introText: introMap.get(saying.intro)?.introText || '',
      },
      type_data: {
        id: saying.type,
        name: typeMap.get(saying.type)?.name || '',
      },
    }));
  }, []);
}

export async function getUserSayings(userId: number): Promise<Saying[]> {
  return safeDbQuery(async () => {
    // First, get all sayings for the user
    const rawSayings = await db
      .select()
      .from(Sayings)
      .where(eq(Sayings.userId, userId))
      .orderBy(Sayings.createdAt);

    // Maintain number types from the database
    const userSayings = rawSayings.map((saying) => ({
      id: saying.id,
      intro: saying.intro,
      type: saying.type,
      firstKind: saying.firstKind,
      secondKind: saying.secondKind,
      userId: saying.userId,
      createdAt: saying.createdAt,
    })) as DBSaying[];

    // Get liked status and total likes for each saying
    const likedStatus = new Map<number, boolean>();
    const totalLikes = new Map<number, number>();

    for (const saying of userSayings) {
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
        .where(and(eq(Likes.userId, userId), eq(Likes.sayingId, saying.id)))
        .get();
      likedStatus.set(saying.id, !!like);
    }

    // Then, get the related data for each saying
    const sayingsWithData = await Promise.all(
      userSayings.map(async (saying) => {
        const [intro, type] = await Promise.all([
          db.select().from(Intros).where(eq(Intros.id, saying.intro)).get() as Promise<
            DBIntro | undefined
          >,
          db.select().from(Types).where(eq(Types.id, saying.type)).get() as Promise<
            DBType | undefined
          >,
        ]);

        return {
          ...saying,
          introText: intro?.introText || '',
          typeName: type?.name || '',
          intro_data: intro
            ? {
                id: intro.id,
                introText: intro.introText,
              }
            : undefined,
          type_data: type
            ? {
                id: type.id,
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
