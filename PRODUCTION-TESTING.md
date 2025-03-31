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
4. Make sure to configure the necessary environment variables in the Vercel dashboard

The application uses the Vercel adapter which handles all the serverless deployment configuration automatically.

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