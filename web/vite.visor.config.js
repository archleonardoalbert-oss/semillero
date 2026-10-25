import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

// El visor de una germinación exportada: una página aparte, sin API ni WebSocket, que se embebe en el ejecutable.
export default defineConfig({
  root: fileURLToPath(new URL('./visor', import.meta.url)),
  plugins: [svelte()],
  build: { outDir: '../dist-visor', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
});
