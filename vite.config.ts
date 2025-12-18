import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react(), tsconfigPaths()],
  server: {
    port: 5173,
    strictPort: false,
  },
  build: {
    // ✅ Aumentar limite de aviso de tamanho de chunk (padrão é 500kb)
    chunkSizeWarningLimit: 1000, // 1MB
    rollupOptions: {
      output: {
        // ✅ Dividir chunks para melhor performance
        manualChunks: {
          // Separar vendor chunks grandes
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['lucide-react'],
        },
      },
    },
  },
})
