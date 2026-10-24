import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `vite build`            -> dist/ (multi-file, for dev/preview/Capacitor)
// `vite build --mode itch` -> single index.html (everything inlined) for itch.io
export default defineConfig(({ mode }) => {
  const itch = mode === 'itch';
  return {
    base: './',
    server: { port: 3000, host: '0.0.0.0' },
    plugins: [react(), ...(itch ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    build: {
      target: 'es2020',
      assetsInlineLimit: itch ? 100000000 : 4096,
      cssCodeSplit: !itch,
      chunkSizeWarningLimit: 2000,
    },
    resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  };
});
