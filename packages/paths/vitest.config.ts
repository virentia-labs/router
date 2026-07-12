import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // Type tests (*.test-d.ts) are gated authoritatively by the repo-wide
    // `pnpm typecheck` (tsc --noEmit). This config lets `vitest --typecheck.only`
    // run/report them on demand without slowing the default runtime `test`.
    typecheck: {
      tsconfig: new URL("../../tsconfig.json", import.meta.url).pathname,
      include: ["**/*.test-d.ts"]
    }
  }
});
