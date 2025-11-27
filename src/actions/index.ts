import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { db, Sayings, Types, Likes, and, eq } from 'astro:db';
import { createLogger } from '../utils/logger';

const logger = createLogger('Actions');

// Define Zod schema for creating a new saying
export const NewSayingSchema = z.discriminatedUnion('typeChoice', [
  z.object({
    typeChoice: z.literal('existing'),
    type: z.string().min(1, 'Please select a type'),
    intro: z.string().min(1, 'Please select an introduction'),
    firstKind: z.string().min(3).max(100),
    secondKind: z.string().min(3).max(100),
  }),
  z.object({
    typeChoice: z.literal('new'),
    newType: z.string().min(2).max(50, 'Type name must be between 2 and 50 characters'),
    intro: z.string().min(1, 'Please select an introduction'),
    firstKind: z.string().min(3).max(100),
    secondKind: z.string().min(3).max(100),
  }),
]);

// Define Zod schema for toggle like
const ToggleLikeSchema = z.object({
  sayingId: z.coerce.number().int().positive('Valid saying ID is required'),
  action: z.enum(['like', 'unlike']).optional(),
});

// Export server object with actions as required by Astro 4.15+
export const server = {
  // Export action for toggling likes
  toggleLike: defineAction({
    accept: 'form',
    input: ToggleLikeSchema,
    handler: async (input, { locals }) => {
      logger.debug('toggleLike action called', { sayingId: input.sayingId });

      // Get user ID from locals (set by middleware)
      const userId = locals.dbUser?.id;

      if (!userId) {
        logger.warn('Unauthenticated like attempt', { sayingId: input.sayingId });
        throw new Error('You must be logged in to like a saying');
      }

      const { sayingId } = input;

      try {
        // Check if the like already exists
        const existingLike = await db
          .select()
          .from(Likes)
          .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)))
          .get();

        if (existingLike) {
          // Unlike
          await db
            .delete(Likes)
            .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)))
            .run();

          logger.info('User unliked saying', { userId, sayingId });
          return { liked: false };
        } else {
          // Like
          await db
            .insert(Likes)
            .values({
              sayingId,
              userId,
              createdAt: new Date(),
            })
            .run();

          logger.info('User liked saying', { userId, sayingId });
          return { liked: true };
        }
      } catch (error) {
        logger.error('Error toggling like', { userId, sayingId, error });
        throw error;
      }
    },
  }),

  // Export action for submitting sayings
  submitSaying: defineAction({
    accept: 'form',
    input: NewSayingSchema,
    handler: async (input, context) => {
      logger.debug('submitSaying action called', { input });

      // Get session from locals (set by middleware)
      const session = context.locals.session;

      if (!session?.user?.id) {
        logger.warn('Unauthenticated saying submission attempt');
        throw new Error('You must be logged in to create a saying');
      }

      // Get database user ID from locals (set by middleware)
      const dbUserId = context.locals?.dbUser?.id;

      if (!dbUserId) {
        logger.error('Database user ID not found in locals', {
          sessionUserId: session?.user?.id,
        });
        throw new Error('Database user ID not found');
      }

      // Check rate limits
      const { getRateLimiter } = await import('../utils/ratelimit');
      const rateLimiter = getRateLimiter();

      const rateLimitCheck = await rateLimiter.checkLimit({
        identifier: session.user.id,
        action: 'create_saying',
      });

      if (!rateLimitCheck.allowed) {
        logger.warn('Rate limit exceeded for saying creation', {
          userId: session.user.id,
          current: rateLimitCheck.current,
          limit: rateLimitCheck.limit,
        });
        throw new Error(rateLimitCheck.reason || 'Rate limit exceeded. Please try again later.');
      }

      logger.debug('Rate limit check passed', {
        userId: session.user.id,
        current: rateLimitCheck.current,
        limit: rateLimitCheck.limit,
      });

      // Moderate content before proceeding
      const { getContentModerator } = await import('../utils/moderation');
      const moderator = getContentModerator();

      // Combine all text content for moderation
      const contentToModerate =
        input.typeChoice === 'new'
          ? `${input.firstKind} ${input.secondKind} ${input.newType}`
          : `${input.firstKind} ${input.secondKind}`;

      logger.debug('Moderating content', { contentLength: contentToModerate.length });

      const moderationResult = await moderator.moderateContent({
        text: contentToModerate,
        context: {
          userId: session.user.id,
          contentType: 'saying',
        },
      });

      if (!moderationResult.isSafe) {
        logger.warn('Content flagged by moderation', {
          userId: session.user.id,
          reason: moderationResult.reason,
        });
        throw new Error(
          `Content flagged: ${moderationResult.reason || 'inappropriate content detected'}`
        );
      }

      logger.info('Content passed moderation', { userId: session.user.id });

      // Process type selection
      let typeId: string;

      if (input.typeChoice === 'new') {
        // Create a new type
        const pronoun = 'who'; // Default pronoun - could be added to form later
        logger.info('Creating new type', { newType: input.newType, pronoun });
        const newTypeResult = await db
          .insert(Types)
          .values({
            name: input.newType,
            pronoun: pronoun,
            createdAt: new Date(),
          })
          .returning();

        if (!newTypeResult || newTypeResult.length === 0) {
          logger.error('Failed to create new type', { newType: input.newType, pronoun });
          throw new Error('Failed to create new type');
        }

        typeId = newTypeResult[0].id.toString();
        logger.info('Successfully created new type', { typeId, newType: input.newType });
      } else {
        // Use existing type
        typeId = input.type;
        logger.debug('Using existing type', { typeId });
      }

      // Insert data into database
      const values = {
        intro: input.intro,
        type: typeId,
        firstKind: input.firstKind,
        secondKind: input.secondKind,
        userId: dbUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.debug('Inserting saying', { values });

      const result = await db.insert(Sayings).values(values).returning();

      logger.info('Successfully created saying', { sayingId: result[0].id, userId: dbUserId });

      // Record the action for rate limiting
      await rateLimiter.recordAction({
        identifier: session.user.id,
        action: 'create_saying',
      });

      // Return success with saying ID
      return { success: true, sayingId: result[0].id };
    },
  }),
};
