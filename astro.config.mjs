import { defineConfig, envField } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import db from '@astrojs/db';
import auth from 'auth-astro';
import { fileURLToPath } from 'url';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(),
    db({
      // Set this to false to prevent trying to connect to Astro Studio
      remote: false
    }),
    auth()
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  vite: {
    resolve: {
      alias: {
        'auth:config': fileURLToPath(new URL('./.auth/config.ts', import.meta.url))
      }
    }
  },
  env: {
    schema: {
      // Auth variables
      GITHUB_CLIENT_ID: envField.string({ context: "server", access: "secret" }),
      GITHUB_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
      GOOGLE_CLIENT_ID: envField.string({ context: "server", access: "secret" }),
      GOOGLE_CLIENT_SECRET: envField.string({ context: "server", access: "secret" }),
      AUTH_SECRET: envField.string({ context: "server", access: "secret" }),
      AUTH_TRUST_HOST: envField.boolean({ context: "server", access: "secret", default: true }),
      NEXTAUTH_URL: envField.string({ context: "server", access: "secret" }),
      AUTH_URL: envField.string({ context: "server", access: "secret" }),

      // Database configuration
      ASTRO_DATABASE_FILE: envField.string({ context: "server", access: "public", default: '.astro/db.sqlite' }),
      ASTRO_DB_REMOTE_URL: envField.string({ context: "server", access: "secret", optional: true }),
      ASTRO_DB_APP_TOKEN: envField.string({ context: "server", access: "secret", optional: true }),

      // Public variables
      PUBLIC_SITE_URL: envField.string({ context: "client", access: "public", optional: true })
    }
  }
});