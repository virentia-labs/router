import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@virentia/router-paths": new URL("../paths/lib/index.ts", import.meta.url).pathname
    }
  },
  test: {
    environment: "node"
  }
});
