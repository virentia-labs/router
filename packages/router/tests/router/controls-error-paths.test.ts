import { scope, scoped } from "@virentia/core";
import { describe, expect, it } from "vitest";
import { routerControls } from "../../lib";

describe("router controls without a history", () => {
  describe("navigate", () => {
    it("rejects with a history-not-found error", async () => {
      const controls = routerControls();
      const appScope = scope();

      await expect(
        scoped(appScope, () => controls.navigate({ path: "/x" })),
      ).rejects.toThrow("history not found");
    });
  });

  describe("back", () => {
    it("rejects with a history-not-found error", async () => {
      const controls = routerControls();
      const appScope = scope();

      await expect(
        scoped(appScope, () => controls.back()),
      ).rejects.toThrow("history not found");
    });
  });

  describe("forward", () => {
    it("rejects with a history-not-found error", async () => {
      const controls = routerControls();
      const appScope = scope();

      await expect(
        scoped(appScope, () => controls.forward()),
      ).rejects.toThrow("history not found");
    });
  });
});
