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
        // Separa las librerías pesadas en chunks propios: se descargan en paralelo, se cachean
        // entre despliegues y no inflan el bundle principal. Junto con el lazy-loading por ruta,
        // reduce mucho la carga inicial.
        rollupOptions: {
          output: {
            manualChunks: (id: string) => {
              if (!id.includes('node_modules')) return undefined;
              if (id.includes('xlsx')) return 'vendor-xlsx';
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg') || id.includes('dompurify')) return 'vendor-pdf';
              if (id.includes('qz-tray')) return 'vendor-qz';
              if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';
              if (id.includes('jsbarcode') || id.includes('qrcode')) return 'vendor-barcode';
              if (id.includes('socket.io-client') || id.includes('engine.io')) return 'vendor-socket';
              if (id.includes('react-router') || id.includes('react-dom') || id.includes('/react/') || id.includes('scheduler')) return 'vendor-react';
              return 'vendor';
            },
          },
        },
        chunkSizeWarningLimit: 900,
      },
    };
});
