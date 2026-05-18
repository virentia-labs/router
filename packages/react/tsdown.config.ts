import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["lib/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: ["react", "@virentia/core", "@virentia/react", "@virentia/router"]
  }
});
