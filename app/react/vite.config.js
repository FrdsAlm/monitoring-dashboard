import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { resolve } from 'path'

// Plugin to copy approuter files to dist after build
const copyApprouterFiles = () => ({
  name: 'copy-approuter-files',
  closeBundle() {
    const distDir = resolve(__dirname, 'dist')
    const appDir = resolve(__dirname, '..')

    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true })
    }

    copyFileSync(resolve(appDir, 'package.json'), resolve(distDir, 'package.json'))
    copyFileSync(resolve(appDir, 'xs-app.json'), resolve(distDir, 'xs-app.json'))
    console.log('Copied approuter files to dist/')
  }
})

export default defineConfig({
  plugins: [react(), copyApprouterFiles()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4004',
      '/error-service': 'http://localhost:4004'
    }
  }
})
