import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests: pure logic and route handlers with their I/O (database, storage, queue, AI)
// mocked. The real wiring is covered by the Playwright test in e2e/.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js resolves this marker package at build time; in tests it is a no-op.
      "server-only": fileURLToPath(new URL("./src/test/empty.ts", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
    env: { RATE_LIMIT_SALT: "test-salt" },
  },
});
