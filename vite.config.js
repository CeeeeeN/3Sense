import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/resend": {
        target: "https://api.resend.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/resend/, ""),
      },
    },
  },
})
