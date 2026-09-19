import { defineConfig } from 'vitest/config';

// Keep userscript build plugins out of tests.
export default defineConfig({
  plugins: [
    {
      name: 'userscript-api-test',
      resolveId(id) {
        // Resolve virtual API; tests provide implementation through vi.mock('$').
        if (id === '$') return id;
      }
    }
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
