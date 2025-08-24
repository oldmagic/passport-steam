import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**'],
        exclude: ['examples/**', 'src/**/*.d.ts', 'src/types.ts'],
        thresholds: {
            lines: 90,
            functions: 90,
            branches: 85,
            statements: 90,
        },
    },
  },
});
