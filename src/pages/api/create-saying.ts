import { db, Sayings, Types, Users, eq } from 'astro:db';
import type { APIRoute } from 'astro';
import type { ExtendedSession } from '../../env';
import { getUserDbId } from '../../utils/user-db';
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
      dbId: session?.user?.dbId,
      locals: locals.dbUser ? true : false
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

    // Insert data into database
    // First check if we already have the user ID in locals
    let userId: number | null = null;
    
    // Option 1: Use user ID from locals.dbUser (set by middleware)
    if (locals.dbUser?.id) {
      userId = locals.dbUser.id;
      logger.info('Using user ID from locals:', userId);
    } 
    // Option 2: Use dbId from session if available
    else if (session.user.dbId) {
      userId = session.user.dbId;
      logger.info('Using dbId from session:', userId);
    }
    // Option 3: Try to look up by email directly
    else if (session.user.email) {
      logger.info('Looking up user by email:', session.user.email);
      
      try {
        const dbUser = await db
          .select()
          .from(Users)
          .where(eq(Users.email, session.user.email))
          .get();
          
        if (dbUser) {
          userId = dbUser.id;
          logger.info('Found user by direct email lookup:', userId);
        }
      } catch (dbError) {
        logger.error('Error finding user by email:', dbError);
      }
    }
    // Option 4: Try getUserDbId as a last resort
    if (!userId) {
      logger.info('Trying getUserDbId utility...');
      userId = await getUserDbId(session.user);
      if (userId) {
        logger.info('Found user ID with getUserDbId:', userId);
      }
    }
    
    // If we still don't have a user ID, check once more if the user exists by email
    // before trying to create the user (to avoid UNIQUE constraint violations)
    if (!userId && session.user.email) {
      logger.info('Double-checking if user exists by email:', session.user.email);
      try {
        // Try to find user one more time
        const existingUser = await db
          .select()
          .from(Users)
          .where(eq(Users.email, session.user.email))
          .get();
          
        if (existingUser) {
          // User found on second check, use this ID
          userId = existingUser.id;
          logger.info('Found user on double-check with ID:', userId);
        } else {
          // User truly doesn't exist, now try to create them
          logger.info('Creating new user for:', session.user.email);
          try {
            const now = new Date();
            const newUser = await db
              .insert(Users)
              .values({
                name: session.user.name || '',
                email: session.user.email,
                image: session.user.image || '',
                provider: 'oauth',
                role: 'user',
                lastLogin: now,
                createdAt: now,
                updatedAt: now,
                preferences: {},
              })
              .returning()
              .get();
              
            if (newUser) {
              userId = newUser.id;
              logger.info('Created new user with ID:', userId);
            }
          } catch (createError) {
            // Handle the UNIQUE constraint specifically
            if (createError.code === 'SQLITE_CONSTRAINT_UNIQUE' || 
                (createError.message && createError.message.includes('UNIQUE constraint failed'))) {
              
              logger.info('User was created in a parallel process, trying to fetch again');
              
              // User was likely created in a race condition - try to get it again
              const conflictUser = await db
                .select()
                .from(Users)
                .where(eq(Users.email, session.user.email))
                .get();
                
              if (conflictUser) {
                userId = conflictUser.id;
                logger.info('Successfully retrieved user after conflict with ID:', userId);
              } else {
                logger.error('Could not find user after UNIQUE constraint error');
              }
            } else {
              logger.error('Error creating user:', createError);
            }
          }
        }
      } catch (lookupError) {
        logger.error('Error in double-check lookup:', lookupError);
      }
    }
    
    // Final check - if we still don't have a user ID, we can't continue
    if (!userId) {
      logger.error('User not found in database and could not be created:', session.user.email);
      return redirect('/create?error=Could not find or create user account', 302);
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
