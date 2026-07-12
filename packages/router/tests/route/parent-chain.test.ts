import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";
import type { InternalRoute, Route } from "../../lib";

function internalOf<T extends object | void>(r: Route<T>): InternalRoute<T>["internal"] {
  return (r as unknown as InternalRoute<T>).internal;
}

async function attach(appRouter: any, appScope: any, entries: string[]) {
  await scoped(appScope, () =>
    appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: entries })))
  );
}

describe("route parent chain", () => {
  it("opens the whole parent chain when a child is activated", async () => {
    const grandparent = route({ path: "/gp" });
    const parent = route({ path: "/p", parent: grandparent });
    const child = route({ path: "/c", parent });
    const appScope = scope();
    const runner = scoped(appScope);

    await runner(() => internalOf(child).activateRoute({ navigate: false }, runner));

    scoped(appScope, () => {
      expect(child.isOpened.value).toBe(true);
      expect(parent.isOpened.value).toBe(true);
      expect(grandparent.isOpened.value).toBe(true);
    });
  });

  it("opens the chain with the child and closes it on navigation away", async () => {
    const parent = route({ path: "/parent" });
    const child = route({ path: "/child", parent });
    const other = route({ path: "/other" });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/parent/child"] });
    const appRouter = router({ routes: [parent, child, other] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(parent.isOpened.value).toBe(true);
        expect(child.isOpened.value).toBe(true);
      }),
    );

    history.push("/other");

    await vi.waitFor(() =>
      scoped(appScope, () => {
        expect(other.isOpened.value).toBe(true);
        expect(child.isOpened.value).toBe(false);
        expect(parent.isOpened.value).toBe(false);
      }),
    );
  });

  // Established behavior, intentionally locked (not changed): nested activation
  // passes the SAME payload up the parent chain, so the parent's params store
  // reflects the child's params — including keys the parent's own path does not
  // declare. Consumers read only their own keys.
  describe("when a child is opened with composed params", () => {
    it("mirrors the child's activation payload into the parent's params", async () => {
      const users = route({ path: "/users/:userId" });
      const posts = route({ path: "/posts/:postId", parent: users });
      const appScope = scope();
      const appRouter = router({ routes: [users, posts] });
      await attach(appRouter, appScope, ["/"]);

      // The child route's OWN type only declares `postId`; here we deliberately
      // pass the composed params (userId + postId) to exercise nested activation.
      await scoped(appScope, () =>
        posts.open({ params: { userId: "u1", postId: "p1" } as never })
      );

      scoped(appScope, () => {
        expect(users.isOpened.value).toBe(true);
        expect(users.params.value).toStrictEqual({ userId: "u1", postId: "p1" });
        expect(posts.params.value).toStrictEqual({ userId: "u1", postId: "p1" });
      });
    });
  });
});
