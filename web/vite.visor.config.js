import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

// El visor de una germinación exportada: una página aparte, sin API ni WebSocket, que se embebe en el ejecutable.
// Lleva también el reproductor de escenas (escena.html), el mismo que usa la app.
const raiz = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: raiz,
  plugins: [svelte()],
  build: {
    outDir: 'dist-visor', emptyOutDir: true, chunkSizeWarningLimit: 4000,
    rollupOptions: { input: { visor: `${raiz}visor.html`, escena: `${raiz}escena.html` } },
  },
});
