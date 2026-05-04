import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, 'examples/demo'),
  base: '/agent-sse-flow/',
  build: {
    outDir: resolve(__dirname, 'docs'),
    emptyOutDir: true,
  },
})
