# TwoKinds Astro Project Guide

## Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run astro` - Run Astro CLI commands

## Code Style Guidelines
- TypeScript: Use strict typing (extends "astro/tsconfigs/strict")
- Provide typescript types whenever possible
- use linting and prettier
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

## Project Structure
- `/src/pages/` - All page routes
- `/src/components/` - Reusable UI components
- `/src/layouts/` - Page layout templates
- `/src/assets/` - Static assets (images, etc.)