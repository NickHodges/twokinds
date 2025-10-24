import { db, Sayings, Intros, Types, Likes, Users, eq, desc, and, count } from 'astro:db';
import type { Saying } from '../types/saying';
import { createLogger } from '../utils/logger';

const logger = createLogger('DB Service');

/**
 * Get a complete saying with all related data by ID
 *
 * @param id The ID of the saying to retrieve
 * @returns The saying with intro and type data, or null if not found
 */
export async function getSayingById(id: number) {
  if (!id || !Number.isFinite(id)) {
    logger.error('Invalid saying ID', { id });
    return null;
  }

  logger.debug('Fetching saying by ID', { id });

  try {
    // Get the saying record
    const sayingResults = await db.select().from(Sayings).where(eq(Sayings.id, id));

    // If no results, return null
    if (!sayingResults || sayingResults.length === 0) {
      logger.warn('No saying found with ID', { id });
      return null;
    }

    const saying = sayingResults[0];

    // Add fallback for updatedAt if missing
    if (!saying.updatedAt) {
      saying.updatedAt = saying.createdAt;
    }

    try {
      // Get the related intro and type with error handling
      const [introResults, typeResults] = await Promise.all([
        db
          .select()
          .from(Intros)
          .where(eq(Intros.id, saying.intro))
          .catch(() => []),
        db
          .select()
          .from(Types)
          .where(eq(Types.id, saying.type))
          .catch(() => []),
      ]);

      logger.debug('Successfully fetched saying with related data', { id, sayingId: saying.id });

      // Combine the data
      return {
        ...saying,
        introText: introResults[0]?.introText || 'Unknown intro',
        typeName: typeResults[0]?.name || 'Unknown type',
        pronoun: typeResults[0]?.pronoun || 'who',
      };
    } catch (relationError) {
      logger.error('Error fetching related data for saying', { id, error: relationError });

      // Return the saying with default values for related data
      return {
        ...saying,
        introText: 'Error loading intro',
        typeName: 'Error loading type',
        pronoun: 'who',
      };
    }
  } catch (error) {
    logger.error('Error getting saying by ID', { id, error });
    return null;
  }
}

/**
 * Get all sayings with related data
 *
 * @returns Array of sayings with intro and type data
 */
export async function getAllSayings(): Promise<Saying[]> {
  logger.debug('Fetching all sayings');

  try {
    // Try to fetch sayings from the database
    const rawSayings = await db.select().from(Sayings).orderBy(desc(Sayings.createdAt));

    // Get the related data for each saying with error handling
    const sayingsWithData = await Promise.all(
      rawSayings.map(async (saying) => {
        try {
          const [intro, type] = await Promise.all([
            db
              .select()
              .from(Intros)
              .where(eq(Intros.id, saying.intro))
              .get()
              .catch(() => null), // Fallback to null if intro lookup fails
            db
              .select()
              .from(Types)
              .where(eq(Types.id, saying.type))
              .get()
              .catch(() => null), // Fallback to null if type lookup fails
          ]);

          return {
            id: saying.id,
            intro: saying.intro,
            type: saying.type,
            firstKind: saying.firstKind,
            secondKind: saying.secondKind,
            userId: saying.userId,
            createdAt: saying.createdAt,
            updatedAt: saying.updatedAt || saying.createdAt, // Fallback for missing updatedAt
            introText: intro?.introText || 'Unknown intro',
            typeName: type?.name || 'Unknown type',
            pronoun: type?.pronoun || 'who',
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
                  pronoun: type.pronoun || 'who',
                }
              : undefined,
          };
        } catch (itemError) {
          logger.error('Error processing saying in getAllSayings', {
            sayingId: saying.id,
            error: itemError,
          });

          // Return a basic version of the saying to prevent entire query from failing
          return {
            id: saying.id,
            intro: saying.intro,
            type: saying.type,
            firstKind: saying.firstKind,
            secondKind: saying.secondKind,
            userId: saying.userId,
            createdAt: saying.createdAt,
            updatedAt: saying.updatedAt || saying.createdAt,
            introText: 'Error loading intro',
            typeName: 'Error loading type',
            pronoun: 'who',
          };
        }
      })
    );

    logger.info('Successfully fetched all sayings', { count: sayingsWithData.length });
    return sayingsWithData;
  } catch (dbError) {
    logger.error('Error fetching sayings from database', { error: dbError });

    // In production, return an empty array rather than crashing
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    // In development, rethrow the error for debugging
    throw dbError;
  }
}

export async function getUserSayings(userIdOrEmail: string | number): Promise<Saying[]> {
  logger.debug('getUserSayings called', { userIdOrEmail, type: typeof userIdOrEmail });

  try {
    if (!userIdOrEmail) {
      logger.error('No user ID or email provided');
      return [];
    }

    // Find the right database user ID
    let dbUserId: number | null = null;

    if (typeof userIdOrEmail === 'number') {
      // If it's already a number, use it directly
      dbUserId = userIdOrEmail;
    } else if (typeof userIdOrEmail === 'string') {
      if (/^\d+$/.test(userIdOrEmail)) {
        // If it's a numeric string (e.g., "1"), convert to number
        dbUserId = parseInt(userIdOrEmail, 10);
      } else if (userIdOrEmail.includes('@')) {
        // If it's an email, look up the user
        logger.debug('Looking up user by email', { email: userIdOrEmail });
        const dbUser = await db
          .select()
          .from(Users)
          .where(eq(Users.email, userIdOrEmail))
          .get()
          .catch((err) => {
            logger.error('Error finding user by email', { email: userIdOrEmail, error: err });
            return null;
          });

        if (dbUser) {
          dbUserId = dbUser.id;
          logger.info('Found user by email', { email: userIdOrEmail, userId: dbUserId });
        } else {
          logger.warn('User not found by email', { email: userIdOrEmail });
        }
      } else {
        // It's probably a UUID from OAuth, try to look up by session ID in Users table
        logger.debug('Looking up user by session ID in provider ID', { userIdOrEmail });
        // We don't have a provider ID column, so we'll need to use email from the session
      }
    }

    if (dbUserId === null) {
      logger.error('Could not determine database user ID', { userIdOrEmail });
      return [];
    }

    logger.debug('Using database user ID', { dbUserId });

    // Get all sayings for the user
    const rawSayings = await db
      .select()
      .from(Sayings)
      .where(eq(Sayings.userId, dbUserId))
      .orderBy(desc(Sayings.createdAt))
      .all() // Use all() instead of get() to get multiple results
      .catch((err) => {
        logger.error('Error fetching sayings for user', { dbUserId, error: err });
        return [];
      });

    // Get liked status and total likes for each saying
    const likedStatus = new Map<number, boolean>();
    const totalLikes = new Map<number, number>();

    for (const saying of rawSayings) {
      try {
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
          .where(and(eq(Likes.userId, dbUserId), eq(Likes.sayingId, saying.id)))
          .get()
          .catch((err) => {
            logger.error('Error getting like status for saying', {
              sayingId: saying.id,
              dbUserId,
              error: err,
            });
            return null;
          });

        likedStatus.set(saying.id, !!like);
      } catch (likeError) {
        logger.error('Error getting likes for saying', { sayingId: saying.id, error: likeError });
        totalLikes.set(saying.id, 0);
        likedStatus.set(saying.id, false);
      }
    }

    // Then, get the related data for each saying
    const sayingsWithData = await Promise.all(
      rawSayings.map(async (saying) => {
        try {
          const [intro, type] = await Promise.all([
            db
              .select()
              .from(Intros)
              .where(eq(Intros.id, saying.intro))
              .get()
              .catch(() => null),
            db
              .select()
              .from(Types)
              .where(eq(Types.id, saying.type))
              .get()
              .catch(() => null),
          ]);

          return {
            id: saying.id,
            intro: saying.intro,
            type: saying.type,
            firstKind: saying.firstKind,
            secondKind: saying.secondKind,
            userId: saying.userId,
            createdAt: saying.createdAt,
            updatedAt: saying.updatedAt || saying.createdAt,
            introText: intro?.introText || 'Unknown intro',
            typeName: type?.name || 'Unknown type',
            pronoun: type?.pronoun || 'who',
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
                  pronoun: type.pronoun || 'who',
                }
              : undefined,
            isLiked: likedStatus.get(saying.id) || false,
            totalLikes: totalLikes.get(saying.id) || 0,
          };
        } catch (itemError) {
          logger.error('Error processing saying in getUserSayings', {
            sayingId: saying.id,
            error: itemError,
          });

          // Return a basic version of the saying to prevent entire query from failing
          return {
            id: saying.id,
            intro: saying.intro,
            type: saying.type,
            firstKind: saying.firstKind,
            secondKind: saying.secondKind,
            userId: saying.userId,
            createdAt: saying.createdAt,
            updatedAt: saying.updatedAt || saying.createdAt,
            introText: 'Error loading intro',
            typeName: 'Error loading type',
            pronoun: 'who',
            isLiked: false,
            totalLikes: 0,
          };
        }
      })
    );

    logger.info('Successfully fetched user sayings', { dbUserId, count: sayingsWithData.length });
    return sayingsWithData;
  } catch (dbError) {
    logger.error('Error fetching user sayings from database', { userIdOrEmail, error: dbError });

    // In production, return an empty array rather than crashing
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    // In development, rethrow the error for debugging
    throw dbError;
  }
}
