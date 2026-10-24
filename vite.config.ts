import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Single-file build for itch.io: produces one self-contained index.html
export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const useSingleFile = env.SINGLEFILE === '1';
    return {
      base: './',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: useSingleFile ? [react(), viteSingleFile()] : [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: useSingleFile ? {
        target: 'es2020',
        cssCodeSplit: false,
        assetsInlineLimit: 100000000,
        chunkSizeWarningLimit: 100000000,
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          }
        }
      } : {
        target: 'es2020',
        assetsInlineLimit: 4096,
        chunkSizeWarningLimit: 2000,
      }
    };
});
