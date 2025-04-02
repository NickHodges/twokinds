import type { Saying } from '../types/saying';
import type { DBSaying, DBIntro, DBType } from '../types/db';
import { db, Sayings, Intros, Types, Likes, eq, and, desc, count } from 'astro:db';
import { createLogger } from '../utils/logger';

const logger = createLogger('DBService');

let dbModule: { db: typeof db } | null = null;

// Dynamically import the database module only if available
(async () => {
  try {
    dbModule = await import('astro:db');
  } catch (importError) {
    // If the database module is not available (e.g., in certain test environments)
    logger.warn(
      'Database module not available in this environment, using fallback data',
      importError
    );
  }
})();

function handleError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'Unknown database error';
  logger.error(`Database Error in ${context}:`, message, error);
  // In a real app, you might want to re-throw a custom error or handle it differently
}

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
export async function getSayingById(id: number): Promise<Saying | null> {
  if (!dbModule?.db) {
    logger.warn('DB not available in getSayingById');
    return null; // Or return fallback data
  }
  try {
    const saying = await dbModule.db.select().from(Sayings).where(eq(Sayings.id, id)).get();
    if (!saying) {
      logger.info(`No saying found with ID: ${id}`); // Use logger
      return null;
    }

    const intro = await dbModule.db.select().from(Intros).where(eq(Intros.id, saying.intro)).get();
    const type = await dbModule.db.select().from(Types).where(eq(Types.id, saying.type)).get();

    return {
      ...saying,
      introText: intro?.introText ?? '', // Provide default empty string
      typeName: type?.name ?? '', // Provide default empty string
    };
  } catch (error) {
    handleError('getSayingById', error);
    return null;
  }
}

/**
 * Get all sayings with related data
 *
 * @returns Array of sayings with intro and type data
 */
export async function getAllSayings(): Promise<Saying[]> {
  if (!dbModule?.db) {
    logger.warn('DB not available in getAllSayings');
    return []; // Or return fallback data
  }

  try {
    // Fetch all data in separate queries
    const allSayings: DBSaying[] = await dbModule.db
      .select()
      .from(Sayings)
      .orderBy(desc(Sayings.createdAt))
      .all();
    const allIntros: DBIntro[] = await dbModule.db.select().from(Intros).all();
    const allTypes: DBType[] = await dbModule.db.select().from(Types).all();

    // Create maps for quick lookups
    const introMap = new Map(allIntros.map((i: DBIntro) => [i.id, i.introText]));
    const typeMap = new Map(allTypes.map((t: DBType) => [t.id, t.name]));

    // Combine data
    const results: Saying[] = allSayings.map((saying: DBSaying) => {
      const introText = introMap.get(saying.intro);
      const typeName = typeMap.get(saying.type);

      if (introText === undefined) {
        logger.error(`Missing intro for saying ${saying.id}: intro=${saying.intro}`);
      }
      if (typeName === undefined) {
        logger.error(`Missing type for saying ${saying.id}: type=${saying.type}`);
      }

      return {
        ...saying,
        introText: introText ?? '',
        typeName: typeName ?? '',
      };
    });

    return results;
  } catch (error) {
    handleError('getAllSayings', error);
    return [];
  }
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
