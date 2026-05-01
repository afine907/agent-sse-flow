import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'AgentSSEFlow',
      fileName: (format) => `agent-sse-flow.${format === 'es' ? 'es' : 'cjs'}.js`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react-markdown'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-markdown': 'ReactMarkdown',
        },
      },
    },
  },
})
