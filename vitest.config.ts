import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': import.meta.dirname,
      'server-only': path.resolve(import.meta.dirname, 'tests/stubs/empty.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['dotenv/config'],
    fileParallelism: false,
    testTimeout: 20000,
  },
});
