import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8000';

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },

    server: {
      port: 5173,
      // Le front et le FastAPI ne tournent pas sur le même hôte. En
      // développement, le proxy évite d'avoir à ouvrir CORS côté serveur.
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },

    build: {
      // Le serveur de bord sert des fichiers statiques déjà construits : aucune
      // compilation n'a lieu à bord, et aucun paquet n'est téléchargé.
      outDir: 'dist',
      sourcemap: false,
      target: 'es2022',
      rollupOptions: {
        output: {
          // L'archive de déploiement contient tout : on sépare les gros
          // morceaux pour que le serveur de bord les serve en cache long.
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion';
            if (id.includes('/react') || id.includes('/scheduler/')) return 'react';
            return 'vendor';
          },
        },
      },
    },
  };
});
