import { db, Sayings, Types, Intros } from "astro:db";
import { eq } from "drizzle-orm";
import { getSession } from "auth-astro/server";
import authConfig from "../../../auth.config";
import type { ExtendedSession } from "../../env";
import type { APIRoute } from "astro";
import { z } from "zod";

// Define the form schema for validation
const formSchema = z.object({
  intro: z.string().min(1, "Introduction is required"),
  typeChoice: z.enum(["existing", "new"]),
  type: z.string().optional(),
  newType: z.string().optional(),
  firstKind: z.string().min(3, "First kind must be at least 3 characters").max(100, "First kind cannot exceed 100 characters"),
  secondKind: z.string().min(3, "Second kind must be at least 3 characters").max(100, "Second kind cannot exceed 100 characters")
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get the form data
    const formData = await request.formData();
    const formDataObject: Record<string, any> = {};

    // Convert FormData to a plain object
    for (const [key, value] of formData.entries()) {
      formDataObject[key] = value;
    }

    console.log("API: Form data received:", formDataObject);

    // Parse and validate using zod
    const parseResult = formSchema.safeParse(formDataObject);
    if (!parseResult.success) {
      return new Response(JSON.stringify({
        success: false,
        error: `Validation error: ${parseResult.error.message}`
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = parseResult.data;

    // Get user session
    const session = (await getSession(request, authConfig)) as ExtendedSession | null;
    const userId = session?.user?.id || "system";

    // Validate intro exists
    const intro = await db.select().from(Intros).where(eq(Intros.id, parseInt(data.intro))).get();
    if (!intro) {
      return new Response(JSON.stringify({
        success: false,
        error: "Selected introduction not found"
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let typeId: number | undefined;

    // Handle type based on selection
    if (data.typeChoice === "existing" && data.type) {
      try {
        // Verify existing type
        const existingType = await db.select().from(Types).where(eq(Types.id, parseInt(data.type))).get();
        if (!existingType) {
          return new Response(JSON.stringify({
            success: false,
            error: "Selected type not found"
          }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        typeId = existingType.id;
        console.log("API: Using existing type with ID:", typeId);
      } catch (existingTypeError) {
        console.error("API: Error finding existing type:", existingTypeError);
        return new Response(JSON.stringify({
          success: false,
          error: `Error finding existing type: ${existingTypeError instanceof Error ? existingTypeError.message : "Unknown error"}`
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (data.typeChoice === "new" && data.newType) {
      try {
        // Create new type with explicit values and type checking
        console.log("API: Creating new type:", data.newType);

        // First insert the new type
        const insertResult = await db.insert(Types).values({
          name: data.newType,
          createdAt: new Date()
        }).returning();

        console.log("API: Insert result:", insertResult);

        if (!insertResult || !Array.isArray(insertResult) || insertResult.length === 0) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to create new type: No result returned"
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const newType = insertResult[0];

        if (!newType || typeof newType !== 'object' || !('id' in newType)) {
          return new Response(JSON.stringify({
            success: false,
            error: "Failed to create new type: Invalid result structure"
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        typeId = newType.id;
        console.log("API: New type created with ID:", typeId);
      } catch (typeError) {
        console.error("API: Error creating new type:", typeError);
        return new Response(JSON.stringify({
          success: false,
          error: `Failed to create new type: ${typeError instanceof Error ? typeError.message : "Unknown error"}`
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      return new Response(JSON.stringify({
        success: false,
        error: "Either select an existing type or create a new one"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Ensure typeId is defined and is a number
    if (typeof typeId !== 'number' || isNaN(typeId)) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid type ID"
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log("API: Creating new saying with type ID:", typeId);

    try {
      // Insert the new saying
      const sayingInsertResult = await db.insert(Sayings).values({
        intro: parseInt(data.intro),
        type: typeId,
        firstKind: data.firstKind,
        secondKind: data.secondKind,
        userId,
        createdAt: new Date()
      }).returning();

      if (!sayingInsertResult || !Array.isArray(sayingInsertResult) || sayingInsertResult.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: "Failed to create new saying: No result returned"
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const newSaying = sayingInsertResult[0];
      console.log("API: New saying created:", newSaying);

      return new Response(JSON.stringify({
        success: true,
        data: newSaying
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (insertError) {
      console.error("API: Error inserting saying:", insertError);
      return new Response(JSON.stringify({
        success: false,
        error: `Error creating saying: ${insertError instanceof Error ? insertError.message : "Unknown error"}`
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("API: Unhandled error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Failed to process request"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};