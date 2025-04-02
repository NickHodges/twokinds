import { db, Sayings, Types, eq } from 'astro:db';
import type { APIRoute } from 'astro';
import type { ExtendedSession } from '../../env';
import { z } from 'zod';
import { createLogger } from '../../utils/logger';

const logger = createLogger('API/CreateSaying');

// Define the form schema for validation - make newType conditional
const formSchema = z.discriminatedUnion('typeChoice', [
  // When typeChoice is 'existing'
  z.object({
    typeChoice: z.literal('existing'),
    type: z.number().int().positive('Please select a type'),
    intro: z.number().int().positive('Please select an introduction'),
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
    type: z.number().int().optional(),
    intro: z.number().int().positive('Please select an introduction'),
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
export const POST: APIRoute = async ({ request, locals }) => {
  const session = locals.session as ExtendedSession | null;

  if (!session?.user?.id) {
    return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
  }

  try {
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
      logger.error('Validation errors:', parseResult.error.flatten());
      return new Response(
        JSON.stringify({ message: 'Invalid input', errors: parseResult.error.flatten() }),
        { status: 400 }
      );
    }

    const body = parseResult.data;
    logger.info('Validated data:', body);
    logger.info('API session user ID:', session.user.id);

    // Process type selection
    let typeId: number;

    if (body.typeChoice === 'new') {
      // Create a new type
      const existingType = await db
        .select({ id: Types.id })
        .from(Types)
        .where(eq(Types.name, body.newType))
        .get();
      if (existingType) {
        typeId = existingType.id;
      } else {
        const newTypeResult = await db
          .insert(Types)
          .values({ name: body.newType, createdAt: new Date() })
          .returning({ id: Types.id });
        if (!newTypeResult || newTypeResult.length === 0) {
          return new Response(JSON.stringify({ message: 'Failed to create new type' }), {
            status: 500,
          });
        }
        typeId = newTypeResult[0].id;
      }
    } else {
      // Use existing type
      typeId = body.type;
    }

    if (!typeId) {
      return new Response(JSON.stringify({ message: 'Invalid type selected or created' }), {
        status: 400,
      });
    }

    // Insert data into database
    const values = {
      intro: body.intro,
      type: typeId,
      firstKind: body.firstKind,
      secondKind: body.secondKind,
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    logger.info('Inserting saying:', values);
    const result = await db.insert(Sayings).values(values).returning({ id: Sayings.id });

    if (!result || result.length === 0) {
      return new Response(JSON.stringify({ message: 'Failed to save saying' }), { status: 500 });
    }

    return new Response(JSON.stringify({ success: true, id: result[0].id }), { status: 201 });
  } catch (error) {
    logger.error('Error in create-saying API:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
};
