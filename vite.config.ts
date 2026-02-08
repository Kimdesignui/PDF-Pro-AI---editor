import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    return {
      base: './',
      plugins: [react()],
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: { '@': path.resolve(__dirname, './') }
      },
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: { main: path.resolve(__dirname, 'index.html') }
        }
      }
    };
});
