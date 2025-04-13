import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { db, Sayings, Types, Likes, and, eq } from 'astro:db';
import { getSession } from 'auth-astro/server';

// Define Zod schema for sign-in validation
const SignInSchema = z.object({
  provider: z.enum(['github', 'google']),
  callbackUrl: z.string().optional(),
});

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
    name: 'toggleLike',
    accept: 'form',
    input: ToggleLikeSchema,

    // Handle form toggling a like
    async handler({ request }) {
      try {
        const session = await getSession(request);
        if (!session?.user?.id) {
          return {
            success: false,
            error: 'You must be logged in to like a saying',
          };
        }

        const userId = session.user.id;
        const formData = await request.formData();
        const sayingId = Number(formData.get('sayingId'));
        const action = formData.get('action') as 'like' | 'unlike' | undefined;

        // Check if the like already exists
        const existingLike = await db
          .select()
          .from(Likes)
          .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)))
          .limit(1);

        // Determine if we need to like or unlike
        const shouldLike = action === 'like' || (action === undefined && existingLike.length === 0);
        const shouldUnlike =
          action === 'unlike' || (action === undefined && existingLike.length > 0);

        if (shouldLike && existingLike.length === 0) {
          try {
            // Add the like
            await db.insert(Likes).values({
              sayingId,
              userId,
              createdAt: new Date(),
            });
            return {
              success: true,
              action: 'liked',
            };
          } catch (dbError) {
            console.error('Database error adding like:', dbError);
            return {
              success: false,
              error: 'Unable to like this saying at the moment. Please try again later.',
            };
          }
        } else if (shouldUnlike && existingLike.length > 0) {
          try {
            // Remove the like
            await db
              .delete(Likes)
              .where(and(eq(Likes.sayingId, sayingId), eq(Likes.userId, userId)));
            return {
              success: true,
              action: 'unliked',
            };
          } catch (dbError) {
            console.error('Database error removing like:', dbError);
            return {
              success: false,
              error: 'Unable to unlike this saying at the moment. Please try again later.',
            };
          }
        } else {
          // No change needed
          return {
            success: true,
            action: shouldLike ? 'already-liked' : 'already-unliked',
          };
        }
      } catch (error) {
        console.error('Error updating like status:', error);
        return {
          success: false,
          error: 'Failed to update like status',
        };
      }
    },
  }),

  // Export action for submitting sayings
  submitSaying: defineAction({
    name: 'submitSaying',
    accept: 'form',

    // Handle the form submission
    async handler({ request, cookies, url }) {
      try {
        // Use the request object from the context
        let session;
        try {
          session = await getSession(request);
        } catch (error) {
          // Fallback to cookies if request doesn't work
          console.error('Error getting session from request:', error);
          const headers = new Headers();
          for (const [name, value] of Object.entries(cookies || {})) {
            headers.append('Cookie', `${name}=${value}`);
          }

          session = await getSession({ headers });
        }

        if (!session?.user?.id) {
          const redirectUrl = url
            ? `${url.origin}/create?error=${encodeURIComponent('You must be logged in to create a saying')}`
            : '/create?error=AuthRequired';
          return Response.redirect(redirectUrl, 302);
        }

        // Get form data
        const formData = await request.formData();
        console.log('Form data:', Object.fromEntries(formData.entries()));

        // Process form data
        const typeChoice = formData.get('typeChoice') as string;
        const type = formData.get('type') as string;
        const intro = formData.get('intro') as string;
        const firstKind = formData.get('firstKind') as string;
        const secondKind = formData.get('secondKind') as string;
        const newType = formData.get('newType') as string;

        // Basic validation
        if (!intro || !firstKind || !secondKind) {
          const redirectUrl = url
            ? `${url.origin}/create?error=${encodeURIComponent('Missing required fields')}`
            : '/create?error=MissingFields';
          return Response.redirect(redirectUrl, 302);
        }

        if (typeChoice === 'existing' && !type) {
          const redirectUrl = url
            ? `${url.origin}/create?error=${encodeURIComponent('Please select a type')}`
            : '/create?error=TypeRequired';
          return Response.redirect(redirectUrl, 302);
        }

        if (typeChoice === 'new' && (!newType || newType.length < 2)) {
          const redirectUrl = url
            ? `${url.origin}/create?error=${encodeURIComponent('Please enter a valid new type name (at least 2 characters)')}`
            : '/create?error=InvalidTypeLength';
          return Response.redirect(redirectUrl, 302);
        }

        // Process type selection
        let typeId;

        if (typeChoice === 'new') {
          // Create a new type
          const newTypeResult = await db
            .insert(Types)
            .values({
              name: newType,
              createdAt: new Date(),
            })
            .returning();

          if (!newTypeResult || newTypeResult.length === 0) {
            const redirectUrl = url
              ? `${url.origin}/create?error=${encodeURIComponent('Failed to create new type')}`
              : '/create?error=TypeCreationFailed';
            return Response.redirect(redirectUrl, 302);
          }

          typeId = newTypeResult[0].id;
        } else {
          // Use existing type
          typeId = type;
        }

        // Insert data into database
        const values = {
          intro: intro,
          type: typeId,
          firstKind: firstKind,
          secondKind: secondKind,
          userId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(), // Ensure updatedAt is set
        };

        console.log('Inserting saying:', values);

        try {
          const result = await db.insert(Sayings).values(values).returning();

          // Return redirect with success
          const redirectUrl = url
            ? `${url.origin}/create?success=true&id=${result[0].id}`
            : `/create?success=true&id=${result[0].id}`;
          return Response.redirect(redirectUrl, 302);
        } catch (dbError) {
          console.error('Database error when inserting saying:', dbError);

          // If we're in production and having database issues, provide a more user-friendly error
          if (process.env.NODE_ENV === 'production') {
            const redirectUrl = url
              ? `${url.origin}/create?error=${encodeURIComponent('Unable to save your saying at this time. Please try again later.')}`
              : `/create?error=${encodeURIComponent('Service temporarily unavailable')}`;
            return Response.redirect(redirectUrl, 302);
          }

          // In development, show the actual error for debugging
          throw dbError;
        }
      } catch (error) {
        console.error('Error saving saying:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        const redirectUrl = url
          ? `${url.origin}/create?error=${encodeURIComponent(errorMessage)}`
          : `/create?error=${encodeURIComponent(errorMessage)}`;
        return Response.redirect(redirectUrl, 302);
      }
    },
  }),

  // Export action for sign-in
  signIn: defineAction({
    name: 'signIn',
    accept: 'form',
    input: SignInSchema,

    handler: async (body) => {
      try {
        const { provider, callbackUrl = '/' } = body;

        // Auth-astro will handle the redirect
        return {
          success: true,
          redirect: `/api/auth/signin/${provider}?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        };
      } catch (error) {
        console.error('Error during sign-in:', error);
        return {
          success: false,
          error: 'Authentication failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),

  // Delete saying action
  deleteSaying: defineAction({
    name: 'deleteSaying',
    accept: 'form',
    input: z.object({
      sayingId: z.coerce.number().int().positive('Valid saying ID is required'),
      userId: z.coerce.number().int().positive('Valid user ID is required'),
    }),

    async handler({ request }) {
      try {
        // Get the session
        const session = await getSession(request);
        if (!session?.user?.id) {
          return {
            success: false,
            error: 'You must be logged in to delete a saying',
          };
        }

        const form = await request.formData();
        const sayingId = Number(form.get('sayingId'));
        const requestedUserId = Number(form.get('userId'));

        // Use session.user.dbId if available, otherwise session.user.id
        const currentUserId = session.user.dbId || session.user.id;

        console.log('Delete saying request:', {
          sayingId,
          requestedUserId,
          currentUserId,
          sessionUserId: session.user.id,
          dbId: session.user.dbId,
        });

        // Check if the saying exists
        const saying = await db.select().from(Sayings).where(eq(Sayings.id, sayingId)).get();

        if (!saying) {
          return {
            success: false,
            error: 'Saying not found',
          };
        }

        // Verify ownership - compare numerical values
        if (Number(saying.userId) !== Number(currentUserId)) {
          console.error('Unauthorized delete attempt:', {
            sayingUserId: saying.userId,
            currentUserId: currentUserId,
            session: session.user,
          });

          return {
            success: false,
            error: 'You are not authorized to delete this saying',
          };
        }

        // Delete associated likes first
        await db.delete(Likes).where(eq(Likes.sayingId, sayingId)).run();

        // Delete the saying
        await db.delete(Sayings).where(eq(Sayings.id, sayingId)).run();

        console.log('Saying deleted successfully:', sayingId);

        return {
          success: true,
          message: 'Saying deleted successfully',
        };
      } catch (error) {
        console.error('Error deleting saying:', error);
        return {
          success: false,
          error: 'Failed to delete saying',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
  }),
};
