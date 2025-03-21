import { defineConfig } from 'astro/config';
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
  }
});