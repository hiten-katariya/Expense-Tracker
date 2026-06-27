import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Disable source maps in production — prevents exposing source code
    sourcemap: false,

    // Enable minification with terser for advanced dead code elimination
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log/warn/info in production, keep console.error
        drop_console: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.warn', 'console.info'] : [],
      },
      format: {
        // Remove comments in production
        comments: false,
      },
    },

    // Route-based code splitting with manual chunks
    rollupOptions: {
      output: {
        // Content-hash based chunk names — cache busting
        chunkFileNames: 'assets/[hash].js',
        entryFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash].[ext]',

        manualChunks(id) {
          // Admin module isolation — separate chunk ONLY loaded by admins
          if (id.includes('/pages/admin/') || id.includes('/components/AdminLayout')) {
            return 'admin';
          }
          // Vendor chunk for React ecosystem
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          // Heavy vendor libraries get their own chunks
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'vendor-charts';
          }
        },
      },
    },

    // Increase warning threshold for main bundle
    chunkSizeWarningLimit: 600,
  },
  // Environment variable safety: only VITE_ prefixed vars are exposed to client
  // This is Vite's default behavior — no configuration needed
  // SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, GEMINI_API_KEY, ADMIN_EMAIL
  // are all server-side only (no VITE_ prefix)
}))
