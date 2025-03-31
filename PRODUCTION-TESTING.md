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