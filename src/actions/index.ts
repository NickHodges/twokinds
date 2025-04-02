import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { db, Sayings, Types, Likes, and, eq } from 'astro:db';
import type { ExtendedSession } from '../env';
import { createLogger } from '../utils/logger';

const logger = createLogger('Actions');

// Define Zod schema for sign-in validation
const SignInSchema = z.object({
  provider: z.enum(['github', 'google']),
  callbackUrl: z.string().optional(),
});

// Define Zod schema for creating a new saying
export const NewSayingSchema = z.discriminatedUnion('typeChoice', [
  z.object({
    typeChoice: z.literal('existing'),
    type: z.coerce.number().int().positive('Please select a type'),
    intro: z.coerce.number().int().positive('Please select an introduction'),
    firstKind: z.string().min(3).max(100),
    secondKind: z.string().min(3).max(100),
    newType: z.string().optional(),
  }),
  z.object({
    typeChoice: z.literal('new'),
    newType: z.string().min(2).max(50, 'Type name must be between 2 and 50 characters'),
    intro: z.coerce.number().int().positive('Please select an introduction'),
    firstKind: z.string().min(3).max(100),
    secondKind: z.string().min(3).max(100),
    type: z.coerce.number().int().positive().optional(),
  }),
]);

// Define Zod schema for toggle like
const ToggleLikeSchema = z.object({
  sayingId: z.coerce.number().int().positive('Valid saying ID is required'),
  action: z.enum(['like', 'unlike']).optional(),
});

// Zod schema for deleting a saying
const DeleteSayingSchema = z.object({
  sayingId: z.coerce.number().int().positive(),
});

// Restore UpdateSayingSchema
const UpdateSayingSchema = z.discriminatedUnion('typeChoice', [
  z.object({
    sayingId: z.coerce.number().int().positive(),
    typeChoice: z.literal('existing'),
    type: z.coerce.number().int().positive('Please select a type'),
    intro: z.coerce.number().int().positive('Please select an introduction'),
    firstKind: z.string().min(3).max(100),
    secondKind: z.string().min(3).max(100),
    newType: z.string().optional(),
  }),
  z.object({
    sayingId: z.coerce.number().int().positive(),
    typeChoice: z.literal('new'),
    newType: z.string().min(2).max(50, 'Type name must be between 2 and 50 characters'),
    intro: z.coerce.number().int().positive('Please select an introduction'),
    firstKind: z.string().min(3).max(100),
    secondKind: z.string().min(3).max(100),
    type: z.coerce.number().int().positive().optional(),
  }),
]);

// Export server object with actions
export const server = {
  // Action for toggling likes
  toggleLike: defineAction({
    accept: 'form',
    input: ToggleLikeSchema,
    handler: async (input, { locals }) => {
      const session = locals.session as ExtendedSession | null;
      if (!session?.user?.id) {
        return { success: false, error: 'You must be logged in to like a saying' };
      }
      const userId = session.user.id;
      const { sayingId, action } = input;

      try {
        const existingLike = await db
          .select()
          .from(Likes)
          .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)))
          .get();

        const shouldLike = action === 'like' || (action === undefined && !existingLike);
        const shouldUnlike = action === 'unlike' || (action === undefined && !!existingLike);

        if (shouldLike && !existingLike) {
          await db.insert(Likes).values({
            sayingId,
            userId,
            createdAt: new Date(),
          });
          return { success: true, action: 'liked' };
        } else if (shouldUnlike && existingLike) {
          await db.delete(Likes).where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)));
          return { success: true, action: 'unliked' };
        } else {
          return { success: true, action: shouldLike ? 'already-liked' : 'already-unliked' };
        }
      } catch (error) {
        logger.error('Error updating like status:', error);
        return { success: false, error: 'Failed to update like status' };
      }
    },
  }),

  // Action for submitting sayings
  submitSaying: defineAction({
    accept: 'form',
    input: NewSayingSchema,
    handler: async (input, context) => {
      const session = context.locals.session as ExtendedSession | null;
      // Use context.url for origin if needed, but return objects
      // const redirectBase = context.url?.origin || '';

      if (!session?.user?.id) {
        // Return error object
        return { success: false, error: 'You must be logged in to create a saying' };
      }

      let typeId = 0;
      try {
        if (input.typeChoice === 'new') {
          const existingType = await db
            .select({ id: Types.id })
            .from(Types)
            .where(eq(Types.name, input.newType))
            .get();
          if (existingType) {
            typeId = existingType.id;
          } else {
            const newTypeResult = await db
              .insert(Types)
              .values({ name: input.newType, createdAt: new Date() })
              .returning({ id: Types.id });
            if (!newTypeResult || newTypeResult.length === 0) {
              // Return error object
              return { success: false, error: 'Failed to create new type' };
            }
            typeId = newTypeResult[0].id;
          }
        } else {
          typeId = input.type;
        }

        if (!typeId) {
          // Return error object
          return { success: false, error: 'Invalid type selected or created' };
        }

        const values = {
          intro: input.intro,
          type: typeId,
          firstKind: input.firstKind,
          secondKind: input.secondKind,
          userId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        const result = await db.insert(Sayings).values(values).returning({ id: Sayings.id });
        logger.info(`Saying ${result[0].id} created successfully by user ${session.user.id}`);
        // Return success object
        return { success: true, createdId: result[0].id };
      } catch (error) {
        logger.error('Error saving saying:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        // Return error object
        return { success: false, error: errorMessage };
      }
    },
  }),

  // Action for sign-in
  signIn: defineAction({
    accept: 'form',
    input: SignInSchema,
    handler: async ({ provider, callbackUrl }, context) => {
      const session = context.locals.session as ExtendedSession | null;
      // const redirectBase = context.url?.origin || ''; // Not needed

      if (session?.user) {
        logger.info('User already signed in');
        // Consider returning a specific object or redirecting on client-side
        return { success: false, error: 'Already signed in' };
      }

      try {
        // Instead of redirecting server-side, rely on Auth.js/Astro integration
        // which often handles this flow or provides client-side hooks.
        // The act of calling signIn from Auth.js should initiate the redirect.
        // For now, we return an object indicating the provider chosen.
        // The front-end might need to react to this.
        // Alternatively, the form action itself might trigger the Auth.js redirect.
        logger.info(`Initiating sign in with ${provider}, callback: ${callbackUrl}`);
        // Auth.js should handle the actual redirect when configured properly.
        // Returning an object here might be redundant if the form post directly triggers auth.
        return { success: true, provider: provider }; // Indicate success/provider

        // Original code attempted server-side redirect:
        // const redirectUrl = `${redirectBase}/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        // return context.redirect(redirectUrl);
      } catch (error) {
        logger.error('Error during sign-in action initiation:', error);
        return { success: false, error: 'Authentication initiation failed' };
      }
    },
  }),

  // Action for deleting sayings
  deleteSaying: defineAction({
    accept: 'form',
    input: DeleteSayingSchema,
    handler: async (input, { locals }) => {
      const session = locals.session as ExtendedSession | null;
      if (!session?.user?.id) {
        return { success: false, error: 'Authentication required.' };
      }
      const userId = session.user.id;
      const userRole = session.user.role; // Restore role check
      const { sayingId } = input;
      try {
        const saying = await db
          .select({ ownerId: Sayings.userId })
          .from(Sayings)
          .where(eq(Sayings.id, sayingId))
          .get();
        if (!saying) {
          return { success: false, error: 'Saying not found.' };
        }
        // Restore admin check
        if (saying.ownerId !== userId && userRole !== 'admin') {
          return { success: false, error: 'Authorization failed.' };
        }
        await db.delete(Likes).where(eq(Likes.sayingId, sayingId));
        await db.delete(Sayings).where(eq(Sayings.id, sayingId));
        logger.info(
          `Saying ${sayingId} deleted successfully by user ${userId} (Role: ${userRole})`
        );
        return { success: true };
      } catch (error) {
        logger.error('Error deleting saying:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: `Failed to delete saying: ${errorMessage}` };
      }
    },
  }),

  // Restore updateSaying action
  updateSaying: defineAction({
    accept: 'form',
    input: UpdateSayingSchema,
    handler: async (input, context) => {
      // Use context for consistency, even if not using redirect
      const session = context.locals.session as ExtendedSession | null;
      // Removed redirectBase/errorRedirectUrl as we return objects

      if (!session?.user?.id) {
        return { success: false, error: 'Authentication required' };
      }
      const userId = session.user.id;
      const userRole = session.user.role;

      try {
        const saying = await db
          .select({ ownerId: Sayings.userId })
          .from(Sayings)
          .where(eq(Sayings.id, input.sayingId))
          .get();
        if (!saying) {
          return { success: false, error: 'Saying not found' };
        }
        // Restore admin check
        if (saying.ownerId !== userId && userRole !== 'admin') {
          return { success: false, error: 'Authorization failed' };
        }

        let finalTypeId = 0;
        if (input.typeChoice === 'new') {
          const existingType = await db
            .select({ id: Types.id })
            .from(Types)
            .where(eq(Types.name, input.newType))
            .get();
          if (existingType) {
            finalTypeId = existingType.id;
          } else {
            const newTypeResult = await db
              .insert(Types)
              .values({ name: input.newType, createdAt: new Date() })
              .returning({ id: Types.id });
            if (!newTypeResult || newTypeResult.length === 0) {
              return { success: false, error: 'Failed to create new type' };
            }
            finalTypeId = newTypeResult[0].id;
          }
        } else {
          finalTypeId = input.type;
        }
        if (!finalTypeId) {
          return { success: false, error: 'Invalid type selected or created' };
        }

        await db
          .update(Sayings)
          .set({
            intro: input.intro,
            type: finalTypeId,
            firstKind: input.firstKind,
            secondKind: input.secondKind,
          })
          .where(eq(Sayings.id, input.sayingId));
        logger.info(`Saying ${input.sayingId} updated by user ${userId} (Role: ${userRole})`);
        // Return success object
        return { success: true, updatedId: input.sayingId };
      } catch (error) {
        logger.error('Error updating saying:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        // Return error object
        return { success: false, error: errorMessage };
      }
    },
  }),
};
