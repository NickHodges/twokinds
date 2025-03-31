import { defineConfig, envField } from 'astro/config';
import db from '@astrojs/db';
import auth from 'auth-astro';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';
import { fileURLToPath } from 'url';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(),
    db(),
    auth()
  ],
  output: 'server',
  site: import.meta.env.PUBLIC_SITE_URL,
  adapter: vercel({
    webAnalytics: { enabled: true },
    imageService: true,
    // Split build into smaller chunks for better performance
    functionPerRoute: true,
    // Increase memory to 1GB (optional, if needed)
    maxDuration: 60
  }),
  server: {
    // Configuration to fix WebSocket issues in WSL
    host: '0.0.0.0',
  },
  vite: {
    resolve: {
      alias: {
        'auth:config': fileURLToPath(new URL('./.auth/config.ts', import.meta.url))
      }
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
  },
  env: {
    schema: {
      // Database configuration
      ASTRO_DATABASE_FILE: envField.string({ context: 'server', access: 'public', default: '.astro/db.sqlite' }),
      ASTRO_DB_REMOTE_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      ASTRO_DB_APP_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),

      // Auth.js Configuration
      AUTH_SECRET: envField.string({ context: 'server', access: 'secret', optional: false }),
      AUTH_TRUST_HOST: envField.boolean({ context: 'server', access: 'secret', default: true }),
      NEXTAUTH_URL: envField.string({ context: 'server', access: 'secret', optional: false }),
      AUTH_URL: envField.string({ context: 'server', access: 'secret', optional: false }),

      // OAuth Provider Credentials
      GITHUB_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: false }),
      GITHUB_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: false }),
      GOOGLE_CLIENT_ID: envField.string({ context: 'server', access: 'secret', optional: false }),
      GOOGLE_CLIENT_SECRET: envField.string({ context: 'server', access: 'secret', optional: false }),

      // Public variables
      PUBLIC_SITE_URL: envField.string({ context: 'client', access: 'public', optional: true })
    },
  },
});
