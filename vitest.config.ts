import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            include: ['src/**/*.ts'],
            exclude: ['src/cli/index.ts'],
            thresholds: {
                statements: 75,
                branches: 70,
                functions: 75,
                lines: 75,
            },
        },
        testTimeout: 60_000,   // integration tests need more time (Playwright)
        hookTimeout: 30_000,
    },
});
