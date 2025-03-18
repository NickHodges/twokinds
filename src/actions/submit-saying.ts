import { defineAction } from 'astro:actions';
import { db, Sayings, Types, Intros } from 'astro:db';
import { eq } from 'drizzle-orm';
import { getSession } from 'auth-astro/server';
import authConfig from '../../auth.config';
import type { ExtendedSession } from '../env';
import { z } from 'zod';

// Define the form schema for validation
const formSchema = z.object({
  intro: z.string().min(1, 'Introduction is required'),
  typeChoice: z.enum(['existing', 'new']),
  type: z.string().optional(),
  newType: z.string().optional(),
  firstKind: z
    .string()
    .min(3, 'First kind must be at least 3 characters')
    .max(100, 'First kind cannot exceed 100 characters'),
  secondKind: z
    .string()
    .min(3, 'Second kind must be at least 3 characters')
    .max(100, 'Second kind cannot exceed 100 characters'),
});

export const submitSaying = defineAction({
  name: 'submitSaying',
  async: true,
  schema: formSchema,
  async handler({ data, _params, request }) {
    try {
      // Get user session
      const session = (await getSession(request, authConfig)) as ExtendedSession | null;
      const userId = session?.user?.id || 'system';

      console.log('Form data received:', data);

      // Validate intro exists
      const intro = await db
        .select()
        .from(Intros)
        .where(eq(Intros.id, parseInt(data.intro)))
        .get();
      if (!intro) {
        return {
          success: false,
          error: 'Selected introduction not found',
        };
      }

      let typeId: number | undefined;

      // Handle type based on selection
      if (data.typeChoice === 'existing' && data.type) {
        try {
          // Verify existing type
          const existingType = await db
            .select()
            .from(Types)
            .where(eq(Types.id, parseInt(data.type)))
            .get();
          if (!existingType) {
            return {
              success: false,
              error: 'Selected type not found',
            };
          }
          typeId = existingType.id;
          console.log('Using existing type with ID:', typeId);
        } catch (existingTypeError) {
          console.error('Error finding existing type:', existingTypeError);
          return {
            success: false,
            error: `Error finding existing type: ${existingTypeError instanceof Error ? existingTypeError.message : 'Unknown error'}`,
          };
        }
      } else if (data.typeChoice === 'new' && data.newType) {
        try {
          // Create new type with explicit values and type checking
          console.log('Creating new type:', data.newType);

          // First insert the new type
          const insertResult = await db
            .insert(Types)
            .values({
              name: data.newType,
              createdAt: new Date(),
            })
            .returning();

          // Then check the result and extract the ID safely
          console.log('Insert result:', insertResult);

          if (!insertResult || !Array.isArray(insertResult) || insertResult.length === 0) {
            throw new Error('Failed to create new type: No result returned');
          }

          const newType = insertResult[0];

          if (!newType || typeof newType !== 'object' || !('id' in newType)) {
            throw new Error('Failed to create new type: Invalid result structure');
          }

          typeId = newType.id;
          console.log('New type created with ID:', typeId);
        } catch (typeError) {
          console.error('Error creating new type:', typeError);
          return {
            success: false,
            error: `Failed to create new type: ${typeError instanceof Error ? typeError.message : 'Unknown error'}`,
          };
        }
      } else {
        return {
          success: false,
          error: 'Either select an existing type or create a new one',
        };
      }

      // Ensure typeId is defined and is a number
      if (typeof typeId !== 'number' || isNaN(typeId)) {
        return {
          success: false,
          error: 'Invalid type ID',
        };
      }

      console.log('Creating new saying with type ID:', typeId);

      // Insert the new saying
      const sayingInsertResult = await db
        .insert(Sayings)
        .values({
          intro: parseInt(data.intro),
          type: typeId,
          firstKind: data.firstKind,
          secondKind: data.secondKind,
          userId,
          createdAt: new Date(),
        })
        .returning();

      if (
        !sayingInsertResult ||
        !Array.isArray(sayingInsertResult) ||
        sayingInsertResult.length === 0
      ) {
        throw new Error('Failed to create new saying: No result returned');
      }

      const newSaying = sayingInsertResult[0];
      console.log('New saying created:', newSaying);

      return {
        success: true,
        data: newSaying,
      };
    } catch (error) {
      console.error('Error creating saying:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create saying',
      };
    }
  },
});
