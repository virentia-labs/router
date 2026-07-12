import { reaction, scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";
import { watchCalls } from "../support/router-harness";

describe("router re-entrancy", () => {
  describe("re-opening the same route from inside its opened reaction", () => {
    it("activates once, keeping opened fired a single time", async () => {
      const a = route({ path: "/a/:id" });
      const appScope = scope();
      const history = createMemoryHistory({ initialEntries: ["/"] });
      const appRouter = router({ routes: [a] });
      const opened = watchCalls(a.opened, appScope);

      let reentered = false;
      reaction({
        on: a.opened,
        run() {
          if (reentered) {
            return;
          }

          reentered = true;
          // Re-enter the router pipeline with the identical location while the
          // first activation's opened is still being observed.
          void a.open({ params: { id: "1" } });
        }
      });

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
      await scoped(appScope, () => a.open({ params: { id: "1" } }));

      await vi.waitFor(() =>
        scoped(appScope, () => expect(a.isOpened.value).toBe(true)),
      );
      // Let any re-entrant echo settle before asserting the count.
      await new Promise((resolve) => setTimeout(resolve, 20));

      expect(opened).toHaveBeenCalledTimes(1);
      scoped(appScope, () => {
        expect(a.isOpened.value).toBe(true);
        expect(a.params.value.id).toBe("1");
      });
    });
  });
});
