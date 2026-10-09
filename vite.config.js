import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import localApiPlugin from './vite-plugins/localApi.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite only injects VITE_-prefixed vars into client code (import.meta.env);
  // it never copies .env into process.env. The local API shim runs plain
  // Node handlers written for Vercel, which read process.env directly, so
  // load everything (empty prefix) and merge it in for dev only.
  if (mode !== 'production') {
    const env = loadEnv(mode, process.cwd(), '');
    Object.assign(process.env, env);
  }

  return {
  plugins: [react(), tailwindcss(), localApiPlugin()],
  server: {
    port: 5173,
    host: false,
  },
  build: {
    chunkSizeWarningLimit: 600,
    modulePreload: {
      // index.html (sitio publico) y admin.html comparten un solo build de Rollup, y
      // Rollup extrae dependencias como jspdf/html2canvas (usadas solo en el modulo de
      // Reportes del panel admin) a un chunk compartido "vendor-exports". Al ser un
      // chunk con nombre fijo, Vite lo agrega como modulepreload en AMBOS entry points
      // aunque el sitio publico jamas lo necesite, forzando a quien va a agendar una
      // cita a descargar ~600KB de codigo de reportes/PDF que nunca va a usar. Se filtra
      // ese chunk (y cualquier otro identificado como admin-only) del preload de index.html.
      resolveDependencies: (filename, deps, { hostId }) => {
        const isPublicEntry = hostId && hostId.replace(/\\/g, '/').endsWith('index.html');
        if (isPublicEntry) {
          return deps.filter((dep) => !dep.includes('vendor-exports'));
        }
        return deps;
      },
    },
    rollupOptions: {
      input: {
        public: 'index.html',
        admin: 'admin.html',
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('xlsx')) {
              return 'vendor-exports';
            }
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-charts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('dexie')) {
              return 'vendor-db';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
          }
        }
      }
    },
  },
  };
})

