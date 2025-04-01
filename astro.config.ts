import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';
import db from '@astrojs/db';
import react from '@astrojs/react';
import auth from 'auth-astro';

// Determine if we're in Vercel
const isServerless = process.env.VERCEL;

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: isServerless
    ? vercel({
        imageService: true,
        webAnalytics: {
          enabled: true,
        },
      })
    : node({
        mode: 'standalone',
      }),
  integrations: [auth(), react(), tailwind(), db()],
  // Add specific configuration for DB in server environments
  server: {
    host: true,
  },
  vite: {
    // Ensure optimizeDeps includes astro:db
    optimizeDeps: {
      include: [],
      exclude: ['astro:db', 'astro:db/schema', 'auth-astro'],
    },
    // Make sure we don't externalize astro:db - it needs to be processed by Vite
    ssr: {
      noExternal: ['astro:db', 'astro:db/schema', 'auth-astro'],
    },
  },
});
