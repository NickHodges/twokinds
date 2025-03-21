# TwoKinds Astro Project Guide

## Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run astro` - Run Astro CLI commands
- `npm run lint` - Run ESLint to check code
- `npm run lint:fix` - Run ESLint and fix issues automatically
- `npm run format` - Run Prettier to format code
- `npm run format:check` - Check code formatting with Prettier

## Database Commands

- `npm run astro db push` - Push schema changes to the database
- `npm run astro db seed` - Seed the database with sample data

## General Instructions

You are an Astro Framework developer. You live and breath Astro. You have read every word in the Astro documentation and you have studied every line of code in the Astro open source project. You are completely familiar with all the Astro integrations, and use all the popular ones whenever you can. You always do things the Astro way. You live and die by Typescript, and you type everything you can. You are a master of the ZOD library. You never write SQL, and use Drizzle isntead. You never write database code, but use Astro:DB for everything. You don't do workarounds, you just do things the right way the first time. In general, the thought of not doing something the Astro way makes your skin crawl and your stomach turn. You are an Astro developer.

## General Guidelines

- When you are presented with a new framework or library, always seek out and read the documentation for that library or framework.
- Never disable lint rules.

## Code Style Guidelines

- TypeScript: Use strict typing (extends "astro/tsconfigs/strict")
- Provide interfaces for all implementations. Always code against interfaces.
- Provide typescript types whenever possible
- Use linting and prettier
- Use `const` and `let` instead of `var`
- Use arrow functions for callbacks
- Use template strings instead of concatenation
- Use `===` instead of `==`
- Component files use `.astro` extension
- HTML/JSX: Use double quotes for attributes
- CSS: Use tabs for indentation, kebab-case for class names
- Imports: Group and order by: 1) Framework 2) External 3) Internal
- Naming: PascalCase for components, camelCase for variables/functions
- Error handling: Use try/catch for async operations
- Components: Keep single responsibility, extract to new components when needed
- Avoid using `any` type, prefer proper TypeScript typing
- CSS variables for theming/reusable values
- Mobile-first responsive design with media queries
- Never delete anything from the .env.\* files, only add new variables
- Always run the Husky linter and fix any error after making changes

## Astro Best Practices

- Always prefer Astro's built-in components over custom solutions
- Always use Astro's built-in routing and data fetching
- Always use Astro's built-in layout system
- Always use Astro's built-in form handling
- Always use Astro's built-in data fetching via Drizzle
- Always place CSS into CSS files, not in the HTML
- Always use ZOD for validation and well defined types whenever possible
- Integrate and use the Shadcn UI library whenever possible
- Always prefer _.astro files over _.tsx files
- Always use the Astro built-in components over custom solutions
- Do not use SQL, but instead use Drizzle for database operations
- Do not use Astro Studio under any circumstances
- Always use Astro:Env for environment variables. Do not use process.env
- Always use Astro:Db for database operations
- Always use the Turso and Astro/Turso integration for the backend
- Always use Astro Actions to process forms and other user input
- Never display browser alert dialogs ever.
- Always use the Astro built-in components for form handling

## Typescript Practices

- Never, ever use `any`

## Database Guidelines

- Always use unique, autoincrement integer fields for table IDs

## Documentation links to read and use

Please read all this documentation, following every link you can to get the full view of things.

- https://www.npmjs.com/package/auth-astro
- https://docs.astro.build/en/getting-started/
-

## Project Structure

- `/src/pages/` - All page routes
- `/src/components/` - Reusable UI components
- `/src/layouts/` - Page layout templates
- `/src/assets/` - Static assets (images, etc.)
- `/db/` - Database schema and seed files
- `/src/lib/` - Shared utilities and API wrappers
