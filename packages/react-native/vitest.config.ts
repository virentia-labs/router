import { reactNative } from "@srsholmes/vitest-react-native";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@virentia/router": new URL("../router/lib/index.ts", import.meta.url).pathname,
      "@virentia/router-paths": new URL("../paths/lib/index.ts", import.meta.url).pathname,
      "@virentia/router-react": new URL("../react/lib/index.ts", import.meta.url).pathname
    }
  },
  plugins: [reactNative()],
  test: {
    setupFiles: ["./tests/setup.ts"]
  }
});
