import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

// Demo pública de solo lectura (para el portafolio): rutas relativas, sin servidor ni WebSocket.
// Los datos se añaden después en dist-demo/demo/ (paquete.json y archivos/).
const raiz = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  root: raiz,
  base: './',
  plugins: [svelte()],
  define: { 'import.meta.env.VITE_DEMO': 'true' },
  build: {
    outDir: 'dist-demo', emptyOutDir: true, chunkSizeWarningLimit: 4000,
    rollupOptions: { input: { app: `${raiz}index.html`, escena: `${raiz}escena.html` } },
  },
});
