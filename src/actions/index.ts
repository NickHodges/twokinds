import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { db, Sayings, Types, Likes, and, eq } from 'astro:db';
import type { ExtendedSession } from '../env';

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
        console.error('Error updating like status:', error);
        return { success: false, error: 'Failed to update like status' };
      }
    },
  }),

  // Action for submitting sayings
  submitSaying: defineAction({
    accept: 'form',
    input: NewSayingSchema,
    handler: async (input, { locals, url }) => {
      const session = locals.session as ExtendedSession | null;
      const redirectBase = url?.origin || '';

      if (!session?.user?.id) {
        return new Response(null, {
          status: 302,
          headers: {
            Location: `${redirectBase}/create?error=${encodeURIComponent('You must be logged in to create a saying')}`,
          },
        });
      }
      const userId = session.user.id;

      try {
        let typeId: number;

        if (input.typeChoice === 'new') {
          const newTypeResult = await db
            .insert(Types)
            .values({ name: input.newType, createdAt: new Date() })
            .returning();
          if (!newTypeResult || newTypeResult.length === 0) {
            return new Response(null, {
              status: 302,
              headers: {
                Location: `${redirectBase}/create?error=${encodeURIComponent('Failed to create new type')}`,
              },
            });
          }
          typeId = newTypeResult[0].id;
        } else {
          typeId = input.type;
        }

        const values = {
          intro: input.intro,
          type: typeId,
          firstKind: input.firstKind,
          secondKind: input.secondKind,
          userId: userId,
          createdAt: new Date(),
        };

        console.log('Inserting saying:', values);
        const result = await db.insert(Sayings).values(values).returning();

        return new Response(null, {
          status: 302,
          headers: { Location: `${redirectBase}/create?success=true&id=${result[0].id}` },
        });
      } catch (error) {
        console.error('Error saving saying:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return new Response(null, {
          status: 302,
          headers: { Location: `${redirectBase}/create?error=${encodeURIComponent(errorMessage)}` },
        });
      }
    },
  }),

  // Action for sign-in
  signIn: defineAction({
    accept: 'form',
    input: SignInSchema,
    handler: async (input, { url }) => {
      const { provider, callbackUrl = '/' } = input;
      const redirectBase = url?.origin || '';
      try {
        const redirectUrl = `${redirectBase}/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        return new Response(null, { status: 302, headers: { Location: redirectUrl } });
      } catch (error) {
        console.error('Error during sign-in action:', error);
        const errorRedirectUrl = `${redirectBase}/auth/error?error=SignInActionFailed`;
        return new Response(null, { status: 302, headers: { Location: errorRedirectUrl } });
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
      const { sayingId } = input;

      try {
        const saying = await db.select().from(Sayings).where(eq(Sayings.id, sayingId)).get();
        if (!saying) {
          return { success: false, error: 'Saying not found.' };
        }
        if (saying.userId !== userId) {
          return { success: false, error: 'Authorization failed.' };
        }
        await db.delete(Likes).where(eq(Likes.sayingId, sayingId));
        await db.delete(Sayings).where(eq(Sayings.id, sayingId));
        console.log(`Saying ${sayingId} deleted successfully by user ${userId}`);
        return { success: true };
      } catch (error) {
        console.error('Error deleting saying:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return { success: false, error: `Failed to delete saying: ${errorMessage}` };
      }
    },
  }),
};
