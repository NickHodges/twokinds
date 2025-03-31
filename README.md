# TwoKinds

A modern web application for creating and sharing "two kinds of people" statements, built with Astro, Tailwind CSS, and Astro:DB.

## About

TwoKinds is a platform where users can create, share, and interact with "There are two kinds of people in the world..." statements. Users can create custom statements, browse existing ones, and interact through likes.

## Features

- **Server-Side Rendering**: Fast page loads with Astro's SSR capabilities
- **User Authentication**: Secure sign-in via auth-astro with GitHub and Google providers
- **Type Safety**: Full TypeScript implementation with strict typing
- **Content Creation**: Create and share your own "two kinds of people" statements
- **Social Interaction**: Like functionality with Astro Actions
- **Responsive Design**: Mobile-first UI built with Tailwind CSS and Shadcn UI
- **Dark Mode Support**: Theme toggle with client-side persistence

## Technology Stack

- **Framework**: [Astro](https://docs.astro.build/)
- **Database**: [Astro:DB](https://docs.astro.build/en/guides/astro-db/) with Turso integration
- **Authentication**: [auth-astro](https://www.npmjs.com/package/auth-astro)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/)
- **Form Handling**: [Astro Actions](https://docs.astro.build/en/guides/server-side-rendering/#actions)
- **Deployment**: Vercel with Astro's Vercel adapter

## Getting Started

### Prerequisites

- Node.js (v18.x or later)
- npm (v9.x or later)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/twokinds.git
   cd twokinds
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Contact the project owner to set up the required environment variables

4. Set up the database:
   ```bash
   npm run astro db push
   npm run astro db seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## Development

### Available Commands

All commands are run from the root of the project:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm run dev`             | Start development server                         |
| `npm run build`           | Build for production                             |
| `npm run preview`         | Preview production build                         |
| `npm run astro`           | Run Astro CLI commands                           |
| `npm run lint`            | Run ESLint to check code                         |
| `npm run lint:fix`        | Run ESLint and fix issues automatically          |
| `npm run format`          | Run Prettier to format code                      |
| `npm run format:check`    | Check code formatting with Prettier              |
| `npm run astro db push`   | Push schema changes to the database              |
| `npm run astro db seed`   | Seed the database with sample data               |
| `npm run production:test` | Test production build with local database        |

## Project Structure

```
/
├── db/               # Database schema and seed files
├── public/           # Static assets (favicon, etc.)
├── src/
│   ├── actions/      # Astro Actions for form processing
│   ├── components/   # Reusable Astro components
│   ├── db/           # Development database utilities
│   ├── layouts/      # Page layout templates
│   ├── lib/          # Shared utilities and API wrappers
│   ├── pages/        # All page routes
│   ├── styles/       # Global CSS files
│   ├── types/        # TypeScript type definitions
│   └── utils/        # Helper utilities
├── astro.config.ts   # Astro configuration
└── tailwind.config.ts # Tailwind CSS configuration
```

## Code Style Guidelines

- TypeScript with strict typing
- Astro components (.astro) preferred over React (.tsx)
- Interfaces for all implementations
- ZOD for validation and type definitions
- No use of `any` type
- CSS in dedicated files using Tailwind utilities
- Components follow single responsibility principle

## Production Deployment

For production deployment, refer to [PRODUCTION-TESTING.md](./PRODUCTION-TESTING.md).

This application is configured for deployment on Vercel using the Astro Vercel adapter in serverless mode. Environment variables must be properly configured in the Vercel dashboard before deployment.

## Environment Variables

This project uses Astro:Env for environment variables. Variables are defined in the schema section of `astro.config.ts` and imported into files using:

```typescript
// For server-side variables
import { VARIABLE_NAME } from 'astro:env/server';

// For client-side variables
import { PUBLIC_VARIABLE_NAME } from 'astro:env/client';
```