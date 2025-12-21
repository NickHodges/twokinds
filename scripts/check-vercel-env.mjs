#!/usr/bin/env node

/**
 * Vercel Environment Variable Checker
 * Verifies all required environment variables are set in Vercel production
 *
 * Prerequisites:
 * - Vercel CLI installed globally: npm i -g vercel
 * - Logged in to Vercel: vercel login
 * - Project linked: vercel link
 */

import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { config } from 'dotenv';

const TEMP_ENV_FILE = '.env.vercel.production.tmp';

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

console.log('🔍 Checking Vercel Production Environment Variables\n');
console.log('=' .repeat(70));

// Check if Vercel CLI is installed
try {
  execSync('vercel --version', { stdio: 'pipe' });
  console.log('\n✅ Vercel CLI is installed\n');
} catch (error) {
  console.log('\n❌ Vercel CLI is not installed\n');
  console.log('Please install it with:');
  console.log('  npm i -g vercel\n');
  console.log('Then login with:');
  console.log('  vercel login\n');
  process.exit(1);
}

// Pull environment variables from Vercel
console.log('📥 Pulling environment variables from Vercel production...\n');

try {
  execSync(`vercel env pull ${TEMP_ENV_FILE} --environment=production --yes`, {
    stdio: 'inherit',
  });
  console.log('\n✅ Successfully pulled environment variables\n');
} catch (error) {
  console.log('\n❌ Failed to pull environment variables from Vercel\n');
  console.log('Make sure you are:');
  console.log('  1. Logged in: vercel login');
  console.log('  2. Project linked: vercel link');
  console.log('  3. Have access to this project\n');
  process.exit(1);
}

// Load the environment variables
if (!existsSync(TEMP_ENV_FILE)) {
  console.log('❌ Environment file was not created\n');
  process.exit(1);
}

config({ path: TEMP_ENV_FILE });

console.log('=' .repeat(70));
console.log('\n📋 VERCEL PRODUCTION VARIABLES:\n');

let missingCritical = [];
let missingOptional = [];
let present = [];

// Check required variables
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
    console.log(`   Status: NOT SET IN VERCEL`);
    if (critical) {
      missingCritical.push(varName);
    } else {
      missingOptional.push(varName);
    }
  }
  console.log('');
}

// Clean up temporary file
try {
  unlinkSync(TEMP_ENV_FILE);
} catch (error) {
  // Ignore cleanup errors
}

// Summary
console.log('=' .repeat(70));
console.log('\n📊 SUMMARY:\n');
console.log(`✅ Set in Vercel: ${present.length} variables`);
console.log(`❌ Missing (critical): ${missingCritical.length} variables`);
console.log(`⚠️  Missing (optional): ${missingOptional.length} variables`);

if (missingCritical.length > 0) {
  console.log('\n❌ CRITICAL VARIABLES MISSING IN VERCEL:\n');
  missingCritical.forEach(varName => {
    console.log(`   - ${varName}`);
    console.log(`     ${requiredVars[varName].description}`);
  });
  console.log('\n⚠️  DEPLOYMENT WILL FAIL - Set these in Vercel dashboard!\n');
  console.log('To add variables to Vercel:');
  console.log('  1. Go to https://vercel.com/dashboard');
  console.log('  2. Select your project');
  console.log('  3. Settings → Environment Variables');
  console.log('  4. Add each missing variable\n');
  process.exit(1);
} else if (missingOptional.length > 0) {
  console.log('\n⚠️  Some optional variables are not set in Vercel.');
  console.log('   Your app will work but may have reduced functionality.\n');
  process.exit(0);
} else {
  console.log('\n✅ ALL REQUIRED VARIABLES ARE SET IN VERCEL!\n');
  console.log('   Your Vercel deployment is properly configured.\n');
  process.exit(0);
}
