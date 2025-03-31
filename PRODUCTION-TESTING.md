# Production Testing Guide

This guide explains how to test the production build of the TwoKinds application locally before deploying it to a production environment.

## Prerequisites

- Node.js and npm installed
- Project dependencies installed (`npm install`)

## Testing Production Build Locally

We've created a streamlined process to test the production build locally with a seeded database:

```bash
npm run production:test
```

This command will:

1. Remove any existing production build and test database
2. Build the application in production mode with a local database
3. Seed the production test database with sample data
4. Start a preview server to serve the production build

## Manual Testing Steps

If you want more control over the testing process, you can follow these steps:

1. Build the application for production with a local database:

```bash
npm run build:local
```

2. Seed the production test database:

```bash
ASTRO_DATABASE_FILE=.astro/prod-db.sqlite node scripts/seed-prod-test.js
```

3. Start the preview server:

```bash
ASTRO_DATABASE_FILE=.astro/prod-db.sqlite npm run preview
```

## Testing Authentication

The production test database includes two seeded users:

1. System User:
   - Email: system@twokindsof.com
   - Used primarily for system operations

2. Demo User:
   - Email: demo@example.com
   - Used for testing user-specific features

Since this is a local preview, you'll need to use the development authentication option to log in.

## Verifying Production Readiness

When testing the production build, check the following:

1. All pages load correctly without errors
2. Authentication and user-specific features work as expected
3. Database operations (creating sayings, liking, etc.) function properly
4. Styles and interactions match the development environment
5. Performance is acceptable

## Notes on Local vs. Remote Database

In a real production environment, you would typically use a remote database rather than a local SQLite file. The local testing setup is designed to simulate production as closely as possible while remaining self-contained.

## Deploying to Production

### Deploying to Vercel (Recommended)

This application is configured to deploy on Vercel:

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Import the project on Vercel's website
3. Vercel will automatically detect the Astro project and deploy it
4. Configure the following environment variables in the Vercel dashboard:

   **Required environment variables:**
   
   These environment variables are defined in `astro.config.ts` using the Astro's EnvFields type-safe system. You'll need to set the following in your Vercel environment settings:
   
   - `AUTH_SECRET` - Secret for authentication (generate using `openssl rand -hex 32`)
   - `AUTH_TRUST_HOST` - Set to `true`
   - `NEXTAUTH_URL` - Set to your Vercel deployment URL (e.g., https://your-app.vercel.app)
   - `AUTH_URL` - Same as NEXTAUTH_URL
   - `GITHUB_CLIENT_ID` - GitHub OAuth client ID
   - `GITHUB_CLIENT_SECRET` - GitHub OAuth client secret
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
   - `PUBLIC_SITE_URL` - Same as NEXTAUTH_URL
   
   **For remote database (recommended for production):**
   
   - `ASTRO_PRODUCTION_DB_TYPE` - Set to `remote`
   - `ASTRO_DB_REMOTE_URL` - Your remote database URL
   - `ASTRO_DB_APP_TOKEN` - Your remote database access token
   
   The project uses Astro's environment variable system which provides type safety and proper access control between server and client code. Environment variables are imported with the correct context:
   
   ```typescript
   // For server-side variables (most auth and database variables)
   import { VARIABLE_NAME } from 'astro:env/server';
   
   // For client-side variables (public variables)
   import { PUBLIC_VARIABLE_NAME } from 'astro:env/client';
   ```

The application uses the Vercel adapter which handles all the serverless deployment configuration automatically.

**Troubleshooting Vercel Deployment:**

If you encounter errors in your Vercel deployment:

1. Check the build logs for any errors related to missing environment variables
2. Verify that all required environment variables are set in the Vercel dashboard
3. Check that the database connection is working correctly
4. Ensure your OAuth providers (GitHub, Google) are correctly configured with the right callback URLs

### Deploying to Other Environments

If you're deploying to a different environment that supports Node.js:

1. Build the application for production:

```bash
npm run build
```

2. Start the Node.js server:

```bash
npm run start
```

Or use the combined deployment script:

```bash
npm run deploy
```

### Important Production Considerations

- For Vercel: The application uses the Vercel adapter in serverless mode
- For other environments: You must run the server using `npm run start` or directly execute the entry point
- There is no static index.html file as this is a server-rendered application
- Ensure all required environment variables are set in your production environment
- For non-Vercel deployments, configure your hosting provider to run the Node.js server on startup