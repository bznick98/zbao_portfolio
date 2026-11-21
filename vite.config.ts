import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { prepareGallery } from './scripts/prepare-gallery.mjs';
import gallerySnapshot from './data/unsplash-snapshot.json';
import { coffeeApi } from './server/coffee-api';

export default defineConfig(async ({ mode, command }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [tailwindcss(), react(), coffeeApi(env)],
      css: { postcss: { plugins: [] } },
      define: {
        __PUBLISHED_GALLERY__: JSON.stringify(await prepareGallery(gallerySnapshot, command === 'build' ? env : {})),
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
