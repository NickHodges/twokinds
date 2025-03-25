import { defineConfig, envField } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import db from '@astrojs/db';
import auth from 'auth-astro';
import { fileURLToPath } from 'url';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), db(), auth()],
  output: 'server',
  site: import.meta.env.PUBLIC_SITE_URL,
  // Add Vercel adapter for server-side rendering
  adapter: vercel(),

  vite: {
    resolve: {
      alias: {
        'auth:config': fileURLToPath(new URL('./.auth/config.ts', import.meta.url)),
      },
    },
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
    build: {
      rollupOptions: {
        external: ['astro:db/schema'],
      },
    },
  },

  env: {
    schema: {
      // Auth variables
      GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret' }),
      GITHUB_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' }),
      GOOGLE_CLIENT_ID: envField.string({ context: 'server', access: 'secret' }),
      GOOGLE_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret' }),
      AUTH_SECRET: envField.string({ context: 'server', access: 'secret' }),
      AUTH_TRUST_HOST: envField.boolean({ context: 'server', access: 'secret', default: true }),
      NEXTAUTH_URL: envField.string({ context: 'server', access: 'secret' }),
      AUTH_URL: envField.string({ context: 'server', access: 'secret' }),

      // Database variables
      ASTRO_DATABASE_FILE: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
        default: '.astro/db.sqlite',
      }),
      ASTRO_DB_REMOTE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      ASTRO_DB_APP_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Ensure we define the Studio token as optional for complete configuration
      ASTRO_STUDIO_APP_TOKEN: envField.string({
        context: 'server',
        access: 'secret',
        optional: true,
      }),

      // Public variables
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
});
