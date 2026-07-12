import { scope, scoped } from "@virentia/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { route } from "../../lib";
import type { InternalRoute, Route } from "../../lib";
import { watchCalls } from "../support/router-harness";

function internalOf<T extends object | void>(r: Route<T>): InternalRoute<T>["internal"] {
  return (r as unknown as InternalRoute<T>).internal;
}

describe("route open environment", () => {
  describe("in a server-like env (no window)", () => {
    it("fires openedOnServer, not openedOnClient", async () => {
      // vitest runs with environment: 'node' here, so `typeof window === 'undefined'`.
      expect(typeof window).toBe("undefined");

      const home = route({ path: "/" });
      const appScope = scope();
      const runner = scoped(appScope);
      const onServer = watchCalls(home.openedOnServer, appScope);
      const onClient = watchCalls(home.openedOnClient, appScope);

      await runner(() => internalOf(home).activateRoute({ navigate: false }, runner));

      expect(onServer).toHaveBeenCalledTimes(1);
      expect(onClient).toHaveBeenCalledTimes(0);
    });
  });

  describe("when a window exists", () => {
    it("fires openedOnClient, not openedOnServer", async () => {
      vi.stubGlobal("window", {});
      try {
        const home = route({ path: "/" });
        const appScope = scope();
        const runner = scoped(appScope);
        const onServer = watchCalls(home.openedOnServer, appScope);
        const onClient = watchCalls(home.openedOnClient, appScope);

        await runner(() => internalOf(home).activateRoute({ navigate: false }, runner));

        expect(onClient).toHaveBeenCalledTimes(1);
        expect(onServer).toHaveBeenCalledTimes(0);
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});
