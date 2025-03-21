import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';

export default defineConfig({
  resolve: {
    alias: {
      'auth:config': fileURLToPath(new URL('./.auth/config.ts', import.meta.url)),
    },
  },
});
