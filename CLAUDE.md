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

## Code Style Guidelines

- TypeScript: Use strict typing (extends "astro/tsconfigs/strict")
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
- Never delete anything from the .env.* files, only add new variables
- Always prefer Astro's built-in components over custom solutions
- Always use Astro's built-in routing and data fetching
- Always use Astro's built-in layout system
- Always use Astro's built-in form handling
- Always use Astro's built-in data fetching
- Always place CSS into CSS files, not in the HTML
-

## Project Structure

- `/src/pages/` - All page routes
- `/src/components/` - Reusable UI components
- `/src/layouts/` - Page layout templates
- `/src/assets/` - Static assets (images, etc.)
- `/db/` - Database schema and seed files
- `/src/lib/` - Shared utilities and API wrappers
