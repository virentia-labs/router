import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["lib/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  deps: {
    neverBundle: [
      "@react-navigation/bottom-tabs",
      "@react-navigation/native",
      "@react-navigation/stack",
      "@virentia/react",
      "@virentia/router",
      "@virentia/router-react",
      "react",
      "react/jsx-runtime",
      "react-native"
    ]
  }
});
