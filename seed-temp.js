import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Load environment variables
dotenv.config();

// Set environment variables explicitly
process.env.ASTRO_DB_REMOTE_URL = 'libsql://twokinds-navynudge.turso.io';
process.env.ASTRO_DB_APP_TOKEN =
  'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NDIyOTE5NDAsImlkIjoiYTQwODA2NDAtNjE0Yy00ZmNmLWI4ODYtYTA1ODQ1ODM4ZGU5IiwicmlkIjoiYTRhMzE4YTEtNDEwNC00YjA2LWE1NjgtMzYzZWUwMzBjOTQ1In0.RdwH0FAS5udr7vGbcYQNqMP6z-XyH8Gf8zhk2bHKvIfPyPu_jb48gAOiRoatRhI5CUCqrxNqpLqd8k1E5omgCg';

// Run the seed script
try {
  execSync('node seed-remote.mjs', { stdio: 'inherit' });
} catch (error) {
  console.error('Error running seed script:', error);
  process.exit(1);
}
