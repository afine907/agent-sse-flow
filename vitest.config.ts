/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest Configuration for TraceScope
 * Unit testing framework integrated with Vite
 */
export default defineConfig({
  plugins: [react()],

  test: {
    // Test environment
    environment: 'jsdom',

    // Global variables (Jest compatibility)
    globals: true,

    // Setup files
    setupFiles: ['./tests/setup.ts'],

    // Test file patterns
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',

      // Coverage thresholds
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 65,
        lines: 70,
      },

      // Only include src directory
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/**/*.d.ts',
        'src/index.ts',
        'src/**/index.ts',
        // Pure type definition files (no runtime code)
        'src/types/**',
        // Examples and demos (not part of library)
        'src/examples/**',
        'src/integrations/**/examples/**',
      ],
    },

    // Timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
  },

  // Path aliases (consistent with vite.config.ts)
  resolve: {
    alias: {
      '@tracescope': path.resolve(__dirname, 'src'),
    },
  },
});
