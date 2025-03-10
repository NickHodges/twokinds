import { db, Sayings, Intros, Leads, eq, desc } from 'astro:db';

/**
 * Get a complete saying with all related data by ID
 *
 * @param id The ID of the saying to retrieve
 * @returns The saying with intro and lead text fields, or null if not found
 */
export async function getSayingById(id: number) {
  try {
    // Get the saying record
    const sayingResults = await db
      .select()
      .from(Sayings)
      .where(eq(Sayings.id, id));

    // If no results, return null
    if (!sayingResults || sayingResults.length === 0) {
      console.log(`No saying found with ID: ${id}`);
      return null;
    }

    const saying = sayingResults[0];

    // Get the related intro
    const introResults = await db
      .select()
      .from(Intros)
      .where(eq(Intros.id, saying.intro));

    // Get the related leads
    const firstLeadResults = await db
      .select()
      .from(Leads)
      .where(eq(Leads.id, saying.firstLead));

    const secondLeadResults = await db
      .select()
      .from(Leads)
      .where(eq(Leads.id, saying.secondLead));

    // Combine the data
    return {
      ...saying,
      introText: introResults[0]?.introText || "Unknown intro",
      firstLeadText: firstLeadResults[0]?.leadText || "Unknown lead",
      secondLeadText: secondLeadResults[0]?.leadText || "Unknown lead",
    };
  } catch (error) {
    console.error('Error getting saying by ID:', error);
    return null;
  }
}

/**
 * Get all sayings with related data
 *
 * @returns Array of sayings with intro and lead text fields
 */
export async function getAllSayings() {
  try {
    // Get all sayings
    const sayings = await db.select().from(Sayings).orderBy(desc(Sayings.id));

    // Get all intros and leads
    const intros = await db.select().from(Intros);
    const leads = await db.select().from(Leads);

    // Combine the data
    return sayings.map(saying => {
      const intro = intros.find(i => i.id === saying.intro);
      const firstLead = leads.find(l => l.id === saying.firstLead);
      const secondLead = leads.find(l => l.id === saying.secondLead);

      return {
        ...saying,
        introText: intro?.introText || "Unknown intro",
        firstLeadText: firstLead?.leadText || "Unknown lead",
        secondLeadText: secondLead?.leadText || "Unknown lead",
      };
    });
  } catch (error) {
    console.error('Error getting all sayings:', error);
    return [];
  }
}