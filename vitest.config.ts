import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(dir, './src'),
      'server-only': path.resolve(dir, './tests/server-only-stub.ts'),
    },
  },
  test: {
    environment: 'node',
  },
});