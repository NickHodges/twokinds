import { db, Sayings, Intros, Types, eq, desc } from 'astro:db';

/**
 * Get a complete saying with all related data by ID
 *
 * @param id The ID of the saying to retrieve
 * @returns The saying with intro and type data, or null if not found
 */
export async function getSayingById(id: number) {
  try {
    // Get the saying record
    const sayingResults = await db.select().from(Sayings).where(eq(Sayings.id, id));

    // If no results, return null
    if (!sayingResults || sayingResults.length === 0) {
      console.log(`No saying found with ID: ${id}`);
      return null;
    }

    const saying = sayingResults[0];

    // Get the related intro
    const introResults = await db.select().from(Intros).where(eq(Intros.id, saying.intro));

    // Get the related type
    const typeResults = await db.select().from(Types).where(eq(Types.id, saying.type));

    // Combine the data
    return {
      ...saying,
      introText: introResults[0]?.introText || 'Unknown intro',
      typeName: typeResults[0]?.name || 'Unknown type',
    };
  } catch (error) {
    console.error('Error getting saying by ID:', error);
    return null;
  }
}

/**
 * Get all sayings with related data
 *
 * @returns Array of sayings with intro and type data
 */
export async function getAllSayings() {
  try {
    // Get all sayings
    const sayings = await db.select().from(Sayings).orderBy(desc(Sayings.id));

    // Get all intros and types
    const intros = await db.select().from(Intros);
    const types = await db.select().from(Types);

    // Combine the data
    return sayings.map((saying) => {
      const intro = intros.find((i) => i.id === saying.intro);
      const type = types.find((t) => t.id === saying.type);

      return {
        ...saying,
        introText: intro?.introText || 'Unknown intro',
        typeName: type?.name || 'Unknown type',
      };
    });
  } catch (error) {
    console.error('Error getting all sayings:', error);
    return [];
  }
}
