import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // NOTA: NO usar manualChunks para separar node_modules manualmente. Rompía el orden de
        // evaluación entre chunks (una lib quedaba sin su clase base → "Class extends value
        // undefined", p.ej. en el chunk de barcode) y la app no cargaba. El lazy-loading por ruta
        // (React.lazy en App.tsx) ya da el mayor beneficio de carga inicial; dejamos que Rollup
        // calcule el chunking de vendors automáticamente (orden correcto garantizado).
        chunkSizeWarningLimit: 1500,
      },
    };
});
