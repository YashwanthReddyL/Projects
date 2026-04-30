import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Local dev only: proxy /api to the backend
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Output to frontend/dist/ — Nginx serves this directly
    outDir: 'dist',
    // Fail the build on any TypeScript errors
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return
        warn(warning)
      },
    },
  },
})
