import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Tải các biến môi trường từ thư mục hiện tại
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      // Quan trọng: Giữ base là './' để chạy được trên GitHub Pages
      base: './',
      
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      
      plugins: [react()],
      
      define: {
        // Chuyển các biến môi trường vào code frontend
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      
      resolve: {
        alias: {
          // Vì bạn để file ở ngoài root, nên alias @ sẽ trỏ thẳng vào root
          '@': path.resolve(__dirname, './'),
        }
      },
      
      build: {
        outDir: 'dist',
        rollupOptions: {
          input: {
            // Chỉ định rõ file đầu vào là index.html ở thư mục gốc
            main: path.resolve(__dirname, 'index.html'),
          },
        },
      }
    };
});
