// Turso database utility functions

import { createClient } from '@libsql/client';

/**
 * Create a Turso database client using environment variables
 */
export function createDbClient() {
  return createClient({
    url: process.env.TURSO_DB_URL || '',
    authToken: process.env.TURSO_DB_AUTH_TOKEN,
  });
}

/**
 * Execute a SQL query against the Turso database
 */
export async function executeQuery(query: string, params: unknown[] = []) {
  const db = createDbClient();

  try {
    return await db.execute({
      sql: query,
      args: params,
    });
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}
