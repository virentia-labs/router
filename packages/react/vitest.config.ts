import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@virentia/router": new URL("../router/lib/index.ts", import.meta.url).pathname,
      "@virentia/router-paths": new URL("../paths/lib/index.ts", import.meta.url).pathname
    }
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    typecheck: {
      tsconfig: new URL("../../tsconfig.json", import.meta.url).pathname,
      include: ["**/*.test-d.ts", "**/*.test-d.tsx"]
    }
  }
});
