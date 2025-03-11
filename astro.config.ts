import { defineConfig, envField } from 'astro/config';
import db from '@astrojs/db';
import dotenv from 'dotenv';

import vercel from '@astrojs/vercel';

// Force load .env
dotenv.config();

// https://astro.build/config
export default defineConfig({
  integrations: [db()],

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
    },
    // Better debug support
    optimizeDeps: {
      include: [],
      force: true,
    },
  },
});
