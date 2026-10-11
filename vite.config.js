import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/resend": {
        target: "https://api.resend.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/resend/, ""),
      },
      '/api': {
        target: 'http://localhost:3000', // Points to your new local-server.js
        changeOrigin: true,
      },
    },
  },
})
