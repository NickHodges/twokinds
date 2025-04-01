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

    // Test Users table
    const usersResult = await client.execute('SELECT * FROM Users');
    console.log('\nUsers:', usersResult.rows);

    // Test Intros table
    const introsResult = await client.execute('SELECT * FROM Intros');
    console.log('\nIntros:', introsResult.rows);

    // Test Types table
    const typesResult = await client.execute('SELECT * FROM Types');
    console.log('\nTypes:', typesResult.rows);

    // Test Sayings table
    const sayingsResult = await client.execute('SELECT * FROM Sayings');
    console.log('\nSayings:', sayingsResult.rows);

    console.log('\nConnection successful! All tables are accessible.');
  } catch (error) {
    console.error('Error:', error);
  }
}

testConnection();
