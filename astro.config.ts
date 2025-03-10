import { defineConfig, envField } from 'astro/config';
import db from '@astrojs/db';
import node from '@astrojs/node';
import dotenv from 'dotenv';

// Force load .env
dotenv.config();

// https://astro.build/config
export default defineConfig({
  integrations: [
    db(),
  ],

  server: {
    // Configuration to fix WebSocket issues in WSL
    host: '0.0.0.0', // Listen on all network interfaces
    port: 4321,
  },
  // Disable pre-rendering to ensure server-side rendering works properly
  output: 'server',
  // Add Node.js adapter for server-side rendering
  adapter: node({
    mode: 'standalone',
  }),

  env: {
       schema: {
           ASTRO_DATABASE_FILE : envField.string({context: "server", access: "secret", optional: false}),
  }
},

  vite: {
    server: {
      hmr: {
        // Force WebSocket connection to use the same hostname
        host: 'localhost',
        // Use the server port (not the HMR port)
        clientPort: 4321,
        // Increase timeout
        timeout: 60000
      },
      fs: {
        // Allow serving files from all directories
        allow: ['.']
      },
    },
    // Better debug support
    optimizeDeps: {
      include: [],
      force: true
    },
  },
});

console.log("ASTRO_DATABASE_FILE:", process.env.ASTRO_DATABASE_FILE);
