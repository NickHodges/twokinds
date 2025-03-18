import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
  url: process.env.ASTRO_DB_REMOTE_URL,
  authToken: process.env.ASTRO_DB_APP_TOKEN,
});

async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log('URL:', process.env.ASTRO_DB_REMOTE_URL);

    // Try to execute a simple query
    const result = await client.execute('SELECT 1');
    console.log('Connection successful!');
    console.log('Query result:', result);
  } catch (error) {
    console.error('Error connecting to database:', error);
  }
}

testConnection();