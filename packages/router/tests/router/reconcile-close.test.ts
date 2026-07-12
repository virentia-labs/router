import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";
import { watchCalls } from "../support/router-harness";

describe("router reconcile", () => {
  describe("navigating away from an open route", () => {
    it("fires closed exactly once", async () => {
      const a = route({ path: "/a" });
      const b = route({ path: "/b" });
      const appScope = scope();
      const history = createMemoryHistory({ initialEntries: ["/a"] });
      const appRouter = router({ routes: [a, b] });
      const closed = watchCalls(a.closed, appScope);

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
      await vi.waitFor(() => scoped(appScope, () => expect(a.isOpened.value).toBe(true)));

      history.push("/b");

      await vi.waitFor(() => scoped(appScope, () => expect(a.isOpened.value).toBe(false)));
      // Give any redundant reconcile a chance to double-fire closed.
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(closed).toHaveBeenCalledTimes(1);
      scoped(appScope, () => expect(b.isOpened.value).toBe(true));
    });
  });
});
