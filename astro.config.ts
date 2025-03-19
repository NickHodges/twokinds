import { defineConfig, envField } from 'astro/config';
import db from '@astrojs/db';
import auth from 'auth-astro';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [db(), auth()],
  output: 'server',
  site: import.meta.env.PUBLIC_SITE_URL,
  db: {
    url: import.meta.env.ASTRO_DB_REMOTE_URL,
    token: import.meta.env.ASTRO_DB_APP_TOKEN,
    file: import.meta.env.ASTRO_DATABASE_FILE,
  },
  server: {
    // Configuration to fix WebSocket issues in WSL
    host: '0.0.0.0',
  },
  // Disable pre-rendering to ensure server-side rendering works properly
  output: 'server',
  // Add Node.js adapter for server-side rendering
  adapter: vercel(),

  env: {
    schema: {
      ASTRO_DATABASE_FILE: envField.string({ context: 'server', access: 'secret', optional: true }),
      ASTRO_DB_REMOTE_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: false,
      }),
      ASTRO_DB_APP_TOKEN: envField.string({ context: 'server', access: 'secret', optional: false }),
      // Auth.js Configuration
      AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: false }),
      AUTH_TRUST_HOST: envField.string({ context: 'server', access: 'secret', optional: false }),
      NEXTAUTH_URL: envField.string({ context: 'server', access: 'secret', optional: false }),
      AUTH_URL: envField.string({ context: 'server', access: 'secret', optional: false }),
      // OAuth Provider Credentials
      GITHUB_ID: envField.string({ context: 'server', access: 'secret', optional: false }),
      GITHUB_SECRET: envField.string({ context: 'server', access: 'secret', optional: false }),
      GOOGLE_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: false }),
      GOOGLE_CLIENT_SECRET: envField.string({
        context: 'server',
        access: 'secret',
        optional: false,
      }),
    },
  },

  vite: {
    server: {
      hmr: {
        // Force WebSocket connection to use the same hostname
        host: 'localhost',
        // Use the server port (not the HMR port)
        clientPort: 4321,
        // Increase timeout
        timeout: 60000,
      },
      fs: {
        // Allow serving files from all directories
        allow: ['.'],
      },
      watch: {
        // Improve file watching in WSL environment
        usePolling: true,
        interval: 1000,
        // Explicitly watch node_modules to catch module updates
        ignored: ['!**/node_modules/**'],
      },
    },
    // Better debug support
    optimizeDeps: {
      include: [],
      force: true,
    },
  },
});
