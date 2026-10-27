import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  build: {
    rollupOptions: { input: {
      lab: fileURLToPath(new URL('./index.html', import.meta.url)),
      sindri: fileURLToPath(new URL('./sindri.html', import.meta.url)),
    } },
  },
});
