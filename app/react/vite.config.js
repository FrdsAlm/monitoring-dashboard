import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // proxy API calls to the CAP backend running on 4004
      '/error-service': 'http://localhost:4004'
    }
  }
})
