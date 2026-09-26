import { defineConfig } from 'vitest/config';
import path from 'path';
import esbuild from 'esbuild';

export default defineConfig({
  plugins: [
    {
      name: 'transform-tsx',
      enforce: 'pre',
      transform(code, id) {
        if (id.endsWith('.tsx') || id.endsWith('.jsx')) {
          const result = esbuild.transformSync(code, {
            loader: 'tsx',
            jsx: 'automatic',
            sourcefile: id,
          });
          return {
            code: result.code,
            map: result.map,
          };
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@/': `${path.resolve(__dirname, 'src')}/`,
      'node:test': 'vitest',
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
  },
});
