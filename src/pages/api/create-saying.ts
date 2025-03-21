import { db, Sayings, Types } from 'astro:db';
import type { APIRoute } from 'astro';
import type { ExtendedSession } from '../../env';
import { z } from 'zod';

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
    // Get session from locals first to verify authentication
    const session = locals.session as ExtendedSession | null;
    console.log('API session:', session?.user);

    if (!session?.user?.id) {
      console.error('No session found or user ID missing');
      return redirect('/auth/signin?redirect=/create', 302);
    }

    // Get form data from request
    const formData = await request.formData();
    const formValues = Object.fromEntries(formData.entries());
    console.log('Received form data:', formValues);

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
      console.error('Validation errors:', parseResult.error);
      return redirect(
        `/create?error=${encodeURIComponent(parseResult.error.issues.map((i) => i.message).join(', '))}`,
        302
      );
    }

    const body = parseResult.data;
    console.log('Validated data:', body);

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
    const values = {
      intro: body.intro,
      type: typeId,
      firstKind: body.firstKind,
      secondKind: body.secondKind,
      userId: session.user.id,
      createdAt: new Date(),
    };

    console.log('Inserting saying:', values);
    const result = await db.insert(Sayings).values(values).returning();

    // Redirect to success page
    return redirect(`/create?success=true&id=${result[0].id}`, 302);
  } catch (error) {
    console.error('Error in create-saying API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return redirect(`/create?error=${encodeURIComponent(errorMessage)}`, 302);
  }
};
