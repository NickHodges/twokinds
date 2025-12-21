#!/usr/bin/env node

/**
 * Environment Variable Checker
 * Verifies all required environment variables are set for production deployment
 */

import { config } from 'dotenv';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file if it exists
const envPath = join(__dirname, '..', '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
  console.log('✓ Loaded .env file\n');
} else {
  console.log('ℹ No .env file found (checking process.env only)\n');
}

// Define required environment variables
const requiredVars = {
  // OpenAI for moderation and cleanup
  OPENAI_API_KEY: {
    description: 'OpenAI API key for content moderation and text cleanup',
    critical: true,
  },

  // Database
  ASTRO_DATABASE_FILE: {
    description: 'Turso database URL',
    critical: true,
  },
  ASTRO_STUDIO_APP_TOKEN: {
    description: 'Turso authentication token',
    critical: true,
  },

  // GitHub OAuth
  GITHUB_CLIENT_ID: {
    description: 'GitHub OAuth application client ID',
    critical: true,
  },
  GITHUB_CLIENT_SECRET: {
    description: 'GitHub OAuth application client secret',
    critical: true,
  },

  // Better Auth
  BETTER_AUTH_SECRET: {
    description: 'Secret key for auth session encryption (should be random & strong)',
    critical: true,
  },
  BETTER_AUTH_URL: {
    description: 'Production URL (e.g., https://yourdomain.com)',
    critical: true,
  },
};

const optionalVars = {
  NODE_ENV: {
    description: 'Environment (development/production) - usually set automatically',
    critical: false,
  },
};

// Check environment variables
console.log('🔍 Checking Environment Variables\n');
console.log('=' .repeat(70));

let missingCritical = [];
let missingOptional = [];
let present = [];

// Check required variables
console.log('\n📋 REQUIRED VARIABLES:\n');
for (const [varName, { description, critical }] of Object.entries(requiredVars)) {
  const value = process.env[varName];
  const isSet = value && value.length > 0;

  if (isSet) {
    console.log(`✅ ${varName}`);
    console.log(`   ${description}`);
    console.log(`   Value: ${'*'.repeat(Math.min(value.length, 20))} (${value.length} chars)`);
    present.push(varName);
  } else {
    console.log(`❌ ${varName}`);
    console.log(`   ${description}`);
    console.log(`   Status: NOT SET`);
    if (critical) {
      missingCritical.push(varName);
    } else {
      missingOptional.push(varName);
    }
  }
  console.log('');
}

// Check optional variables
console.log('\n📋 OPTIONAL VARIABLES:\n');
for (const [varName, { description }] of Object.entries(optionalVars)) {
  const value = process.env[varName];
  const isSet = value && value.length > 0;

  if (isSet) {
    console.log(`✅ ${varName}`);
    console.log(`   ${description}`);
    console.log(`   Value: ${value}`);
    present.push(varName);
  } else {
    console.log(`⚠️  ${varName}`);
    console.log(`   ${description}`);
    console.log(`   Status: NOT SET (optional)`);
    missingOptional.push(varName);
  }
  console.log('');
}

// Summary
console.log('=' .repeat(70));
console.log('\n📊 SUMMARY:\n');
console.log(`✅ Set: ${present.length} variables`);
console.log(`❌ Missing (critical): ${missingCritical.length} variables`);
console.log(`⚠️  Missing (optional): ${missingOptional.length} variables`);

if (missingCritical.length > 0) {
  console.log('\n❌ CRITICAL VARIABLES MISSING:\n');
  missingCritical.forEach(varName => {
    console.log(`   - ${varName}`);
    console.log(`     ${requiredVars[varName].description}`);
  });
  console.log('\n⚠️  DEPLOYMENT WILL FAIL - Set these variables before deploying!\n');
  process.exit(1);
} else if (missingOptional.length > 0) {
  console.log('\n⚠️  Some optional variables are not set.');
  console.log('   Your app will work but may have reduced functionality.\n');
  process.exit(0);
} else {
  console.log('\n✅ ALL REQUIRED VARIABLES ARE SET!\n');
  console.log('   Your application is ready for deployment.\n');
  process.exit(0);
}
