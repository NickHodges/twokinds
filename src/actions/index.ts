import { defineAction } from 'astro:actions';
import { z } from 'zod';
import { db, Sayings } from 'astro:db';
import type { ExtendedSession } from '../env';

export const server = {
  submitSaying: defineAction({
    accept: 'form',
    input: z.object({
      intro: z.string().min(1, 'Please select an introduction'),
      firstLead: z.string().min(1, 'Please select a lead'),
      secondLead: z.string().min(1, 'Please select a lead'),
      firstKind: z
        .string()
        .min(3, 'Must be at least 3 characters')
        .max(100, 'Must not exceed 100 characters'),
      secondKind: z
        .string()
        .min(3, 'Must be at least 3 characters')
        .max(100, 'Must not exceed 100 characters'),
    }),

    // Handle the form submission
    handler: async (body, { locals }) => {
      try {
        const session = locals.session as ExtendedSession | null;
        if (!session?.user?.id) {
          return {
            success: false,
            error: 'You must be logged in to create a saying',
          };
        }

        console.log('Action received form data:', body);

        // Insert data into database
        const values = {
          intro: parseInt(body.intro),
          firstLead: parseInt(body.firstLead),
          secondLead: parseInt(body.secondLead),
          firstKind: body.firstKind,
          secondKind: body.secondKind,
          userId: session.user.id,
          createdAt: new Date(),
        };

        console.log('Inserting values:', values);

        const result = await db.insert(Sayings).values(values).returning();

        // Return success response
        return {
          success: true,
          data: result[0],
        };
      } catch (error) {
        console.error('Error saving saying:', error);
        return {
          success: false,
          error: 'Failed to save saying',
        };
      }
    },
  }),
};
