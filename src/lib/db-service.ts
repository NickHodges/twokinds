import { db, Sayings, Intros, Types, Likes, Users, eq, desc, and, count } from 'astro:db';
import type { Saying } from '../types/saying';

/**
 * Get a complete saying with all related data by ID
 *
 * @param id The ID of the saying to retrieve
 * @returns The saying with intro and type data, or null if not found
 */
export async function getSayingById(id: number) {
  if (!id || !Number.isFinite(id)) {
    console.error(`Invalid saying ID: ${id}`);
    return null;
  }

  try {
    // Get the saying record
    const sayingResults = await db.select().from(Sayings).where(eq(Sayings.id, id));

    // If no results, return null
    if (!sayingResults || sayingResults.length === 0) {
      console.log(`No saying found with ID: ${id}`);
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

      // Combine the data
      return {
        ...saying,
        introText: introResults[0]?.introText || 'Unknown intro',
        typeName: typeResults[0]?.name || 'Unknown type',
      };
    } catch (relationError) {
      console.error(`Error fetching related data for saying ${id}:`, relationError);

      // Return the saying with default values for related data
      return {
        ...saying,
        introText: 'Error loading intro',
        typeName: 'Error loading type',
      };
    }
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
          };
        } catch (itemError) {
          console.error(`Error processing saying ${saying.id}:`, itemError);

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
          };
        }
      })
    );

    return sayingsWithData;
  } catch (dbError) {
    console.error('Error fetching sayings from database:', dbError);

    // In production, return an empty array rather than crashing
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    // In development, rethrow the error for debugging
    throw dbError;
  }
}

export async function getUserSayings(userIdOrEmail: string | number): Promise<Saying[]> {
  try {
    console.log('getUserSayings called with:', userIdOrEmail, 'type:', typeof userIdOrEmail);

    if (!userIdOrEmail) {
      console.error('No user ID or email provided');
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
        console.log('Looking up user by email:', userIdOrEmail);
        const dbUser = await db
          .select()
          .from(Users)
          .where(eq(Users.email, userIdOrEmail))
          .get()
          .catch((err) => {
            console.error('Error finding user by email:', err);
            return null;
          });

        if (dbUser) {
          dbUserId = dbUser.id;
          console.log('Found user by email with ID:', dbUserId);
        } else {
          console.error('User not found by email:', userIdOrEmail);
        }
      } else {
        // It's probably a UUID from OAuth, try to look up by session ID in Users table
        console.log('Looking up user by session ID in provider ID:', userIdOrEmail);
        // We don't have a provider ID column, so we'll need to use email from the session
      }
    }

    if (dbUserId === null) {
      console.error('Could not determine database user ID');
      return [];
    }

    console.log('Using database user ID:', dbUserId);

    // Get all sayings for the user
    const rawSayings = await db
      .select()
      .from(Sayings)
      .where(eq(Sayings.userId, dbUserId))
      .orderBy(desc(Sayings.createdAt))
      .all() // Use all() instead of get() to get multiple results
      .catch((err) => {
        console.error(`Error fetching sayings for user ${dbUserId}:`, err);
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
          .where(and(eq(Likes.userId, numericUserId), eq(Likes.sayingId, saying.id)))
          .get()
          .catch((err) => {
            console.error(`Error getting like status for saying ${saying.id}:`, err);
            return null;
          });

        likedStatus.set(saying.id, !!like);
      } catch (likeError) {
        console.error(`Error getting likes for saying ${saying.id}:`, likeError);
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
        } catch (itemError) {
          console.error(`Error processing saying ${saying.id}:`, itemError);

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
            isLiked: false,
            totalLikes: 0,
          };
        }
      })
    );

    return sayingsWithData;
  } catch (dbError) {
    console.error('Error fetching user sayings from database:', dbError);

    // In production, return an empty array rather than crashing
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    // In development, rethrow the error for debugging
    throw dbError;
  }
}
