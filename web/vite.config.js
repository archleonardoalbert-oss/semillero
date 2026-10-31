import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('.', import.meta.url));
const servidor = 'http://127.0.0.1:4417';

export default defineConfig({
  root: raiz,
  plugins: [svelte()],
  build: {
    outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000,
    // escena.html reproduce una escena de un curso dentro de un iframe aislado.
    rollupOptions: {
      input: { app: `${raiz}index.html`, escena: `${raiz}escena.html`, puente: `${raiz}src/puente/main.js` },
      // El puente de las webs de curso necesita una ruta fija: /semillero-puente.js.
      output: { entryFileNames: (c) => (c.name === 'puente' ? 'semillero-puente.js' : 'assets/[name]-[hash].js') },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: servidor, changeOrigin: true },
      '/archivos': { target: servidor, changeOrigin: true },
      '/ws': { target: servidor.replace('http', 'ws'), ws: true, changeOrigin: true },
    },
  },
});
