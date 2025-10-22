import { db, Sayings, Types, Users, eq } from 'astro:db';
import type { APIRoute } from 'astro';
import type { ExtendedSession } from '../../env';
import { createLogger } from '../../utils/logger';
import { z } from 'zod';

const logger = createLogger('Create Saying API');

// Define the form schema for validation - make newType conditional
const formSchema = z.discriminatedUnion('typeChoice', [
  // When typeChoice is 'existing'
  z.object({
    typeChoice: z.literal('existing'),
    type: z.coerce.number().int().positive('Please select a type'),
    intro: z.coerce.number().int().positive('Please select an introduction'),
    firstKind: z
      .string()
      .min(3, 'Must be at least 3 characters')
      .max(100, 'Must not exceed 100 characters'),
    secondKind: z
      .string()
      .min(3, 'Must be at least 3 characters')
      .max(100, 'Must not exceed 100 characters'),
    newType: z.string().optional(), // No validation needed for this case
  }),
  // When typeChoice is 'new'
  z.object({
    typeChoice: z.literal('new'),
    type: z.coerce.number().int().optional(),
    intro: z.coerce.number().int().positive('Please select an introduction'),
    firstKind: z
      .string()
      .min(3, 'Must be at least 3 characters')
      .max(100, 'Must not exceed 100 characters'),
    secondKind: z
      .string()
      .min(3, 'Must be at least 3 characters')
      .max(100, 'Must not exceed 100 characters'),
    newType: z.string().min(3, 'New type must be at least 3 characters'),
  }),
]);

// Deprecated GET endpoint
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'This endpoint is deprecated. Please use Astro Actions instead.',
    }),
    {
      status: 410, // Gone
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

/**
 * Force create user - An emergency function to ensure user creation works
 *
 * This function attempts multiple strategies to ensure a user exists in the database
 * with a valid ID, using aggressive retry and error handling.
 */
async function forceCreateUser(
  userEmail: string,
  userName?: string | null,
  userImage?: string | null
): Promise<number | null> {
  logger.info('FORCE CREATING USER:', userEmail);

  try {
    // First, attempt to find the user
    let dbUser = await db
      .select()
      .from(Users)
      .where(eq(Users.email, userEmail))
      .get()
      .catch((err) => {
        logger.error('Error in initial user lookup:', err);
        return null;
      });

    // If user exists and has a valid ID, use that
    if (dbUser && typeof dbUser.id === 'number' && dbUser.id > 0) {
      logger.info('User already exists with valid ID:', dbUser.id);
      return dbUser.id;
    }

    // If user exists but has invalid ID, delete it
    if (dbUser) {
      logger.warn('Found user with invalid ID, deleting:', dbUser);
      await db
        .delete(Users)
        .where(eq(Users.email, userEmail))
        .run()
        .catch((err) => {
          logger.error('Failed to delete user with invalid ID:', err);
        });
    }

    // Now create a fresh user
    logger.info('Creating brand new user record');
    const now = new Date();
    const newUser = await db
      .insert(Users)
      .values({
        name: userName || '',
        email: userEmail,
        image: userImage || '',
        provider: 'oauth',
        role: 'user',
        lastLogin: now,
        createdAt: now,
        updatedAt: now,
        preferences: {},
      })
      .returning()
      .get()
      .catch((err) => {
        // Check if it's a unique constraint - user might have been created in parallel
        if (
          err.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
          (err.message && err.message.includes('UNIQUE constraint failed'))
        ) {
          logger.warn('User already created in parallel process');
          return null;
        }
        logger.error('Error creating fresh user:', err);
        return null;
      });

    if (newUser && newUser.id) {
      logger.info('Successfully created fresh user with ID:', newUser.id);
      return newUser.id;
    }

    // If we reach here, the creation might have failed due to a race condition
    // Try one more lookup to find the potentially created user
    logger.info('Performing final lookup');
    dbUser = await db
      .select()
      .from(Users)
      .where(eq(Users.email, userEmail))
      .get()
      .catch((err) => {
        logger.error('Error in final user lookup:', err);
        return null;
      });

    if (dbUser && typeof dbUser.id === 'number' && dbUser.id > 0) {
      logger.info('Found user in final lookup with ID:', dbUser.id);
      return dbUser.id;
    }

    // All strategies failed
    logger.error('All user creation strategies failed');
    return null;
  } catch (error) {
    logger.error('Catastrophic error in forceCreateUser:', error);
    return null;
  }
}

// Handle form submission via API
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  try {
    // Get form data from request
    const formData = await request.formData();
    const formValues = Object.fromEntries(formData.entries());
    logger.info('Received form data:', formValues);

    // Convert to the expected format
    const data = {
      typeChoice: formValues.typeChoice as string,
      type: formValues.type ? Number(formValues.type) : undefined,
      intro: Number(formValues.intro),
      firstKind: formValues.firstKind as string,
      secondKind: formValues.secondKind as string,
      newType: formValues.newType as string,
    };

    // Parse and validate the input data
    const parseResult = formSchema.safeParse(data);
    if (!parseResult.success) {
      logger.error('Validation errors:', parseResult.error);
      return redirect(
        `/create?error=${encodeURIComponent(parseResult.error.issues.map((i) => i.message).join(', '))}`,
        302
      );
    }

    const body = parseResult.data;
    logger.info('Validated data:', body);

    // Get session from locals
    const session = locals.session as ExtendedSession | null;
    logger.info('API session:', {
      id: session?.user?.id,
      email: session?.user?.email,
      locals: locals.dbUser ? true : false,
    });

    if (!session?.user?.id) {
      return redirect('/create?error=You must be logged in to create a saying', 302);
    }

    // Process type selection
    let typeId: number;

    if (body.typeChoice === 'new') {
      // Create a new type
      const newTypeResult = await db
        .insert(Types)
        .values({
          name: body.newType,
          createdAt: new Date(),
        })
        .returning();

      if (!newTypeResult || newTypeResult.length === 0) {
        return redirect('/create?error=Failed to create new type', 302);
      }

      typeId = newTypeResult[0].id;
    } else {
      // Use existing type
      typeId = body.type;
    }

    // First check if we already have the user ID in locals
    let userId: number | null = null;

    // Use user ID from locals.dbUser (set by middleware)
    if (locals.dbUser?.id) {
      userId = locals.dbUser.id;
      logger.info('Using user ID from locals:', userId);
    }

    // If we still don't have userId and we have an email, use our emergency function
    if (!userId && session.user.email) {
      logger.info('No user ID found through normal channels, using emergency function');
      userId = await forceCreateUser(session.user.email, session.user.name, session.user.image);

      if (userId) {
        logger.info('Emergency user creation succeeded with ID:', userId);

        // Update the locals with the new user ID
        if (!locals.dbUser) {
          locals.dbUser = { id: userId };
        } else {
          locals.dbUser.id = userId;
        }
      }
    }

    // Final check - if we still don't have a user ID, we can't continue
    if (!userId) {
      logger.error(
        'Emergency user creation FAILED, absolute last resort failed:',
        session.user.email
      );
      return redirect(
        '/create?error=Could not find or create user account - please contact support',
        302
      );
    }

    logger.info('Using user ID for saying creation:', userId);

    const values = {
      intro: body.intro,
      type: typeId,
      firstKind: body.firstKind,
      secondKind: body.secondKind,
      userId: userId, // Use the numeric ID from our database
      createdAt: new Date(),
    };

    logger.info('Inserting saying:', values);

    try {
      const result = await db.insert(Sayings).values(values).returning();

      if (!result || result.length === 0) {
        logger.error('Insert succeeded but no result returned');
        return redirect('/create?error=Failed to create saying (no result)', 302);
      }

      logger.info('Successfully created saying with ID:', result[0].id);

      // Redirect to success page
      return redirect(`/create?success=true&id=${result[0].id}`, 302);
    } catch (insertError) {
      logger.error('Error inserting saying:', insertError);
      return redirect('/create?error=Failed to create saying, please try again', 302);
    }
  } catch (error) {
    logger.error('Error in create-saying API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return redirect(`/create?error=${encodeURIComponent(errorMessage)}`, 302);
  }
};
