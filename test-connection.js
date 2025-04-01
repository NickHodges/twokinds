import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Turso client
const client = createClient({
  url: process.env.ASTRO_DB_REMOTE_URL,
  authToken: process.env.ASTRO_DB_APP_TOKEN,
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const result = await client.execute('SELECT 1');
    console.log('Connection successful!');
    console.log('Result:', result);
  } catch (error) {
    console.error('Connection failed:', error);
  }
}

testConnection();
