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
  integrations: [react(), tailwind(), db(), auth()],
  vite: {
    build: {
      rollupOptions: {
        external: ['astro:db', 'astro:db/schema'],
      },
    },
  },
});
