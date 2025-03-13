import { defineConfig, envField } from 'astro/config';
import db from '@astrojs/db';
import auth from 'auth-astro';
import dotenv from 'dotenv';
import vercel from '@astrojs/vercel';

// Force load .env
dotenv.config();

// https://astro.build/config
export default defineConfig({
  integrations: [db(), auth()],

  server: {
    // Configuration to fix WebSocket issues in WSL
    host: '0.0.0.0', // Listen on all network interfaces
    port: 4321,
  },
  // Disable pre-rendering to ensure server-side rendering works properly
  output: 'server',
  // Add Node.js adapter for server-side rendering
  adapter: vercel(),

  env: {
    schema: {
      ASTRO_DATABASE_FILE: envField.string({ context: 'server', access: 'secret', optional: true }),
      TURSO_DB_URL: envField.string({ context: 'server', access: 'secret', optional: false }),
      TURSO_DB_AUTH_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: false,
      }),
      ASTRO_DB_REMOTE_URL: envField.string({
        context: 'server',
        access: 'secret',
        optional: false,
      }),
      ASTRO_DB_APP_TOKEN: envField.string({ context: 'server', access: 'secret', optional: false }),
      // Auth.js Configuration
      AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: false }),
      AUTH_TRUST_HOST: envField.string({ context: 'server', access: 'secret', optional: false }),
      // OAuth Provider Credentials
      GITHUB_ID: envField.string({ context: 'server', access: 'secret', optional: false }),
      GITHUB_SECRET: envField.string({ context: 'server', access: 'secret', optional: false }),
      GOOGLE_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: false }),
      GOOGLE_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: false }),
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
