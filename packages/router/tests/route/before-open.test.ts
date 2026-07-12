import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";
import type { InternalRoute, Route } from "../../lib";

function internalOf<T extends object | void>(r: Route<T>): InternalRoute<T>["internal"] {
  return (r as unknown as InternalRoute<T>).internal;
}

describe("route beforeOpen guards", () => {
  it("runs a beforeOpen array strictly in order (sequential await)", async () => {
    const order: string[] = [];
    const step = route({
      path: "/step",
      beforeOpen: [
        async () => {
          await new Promise((r) => setTimeout(r, 20));
          order.push("first");
        },
        async () => {
          await new Promise((r) => setTimeout(r, 1));
          order.push("second");
        },
        () => {
          order.push("third");
        },
      ],
    });
    const appScope = scope();
    const runner = scoped(appScope);

    await runner(() => internalOf(step).activateRoute({ navigate: false }, runner));

    // Despite the first guard being the slowest, ordering is preserved because
    // each guard is awaited before the next starts.
    expect(order).toStrictEqual(["first", "second", "third"]);
  });

  it("passes the activation payload to every guard", async () => {
    const a = vi.fn();
    const b = vi.fn();
    const search = route({ path: "/search/:q", beforeOpen: [a, b] });
    const appScope = scope();
    const runner = scoped(appScope);

    await runner(() =>
      internalOf(search).activateRoute(
        { params: { q: "cats" }, query: { page: "2" }, navigate: false },
        runner,
      ),
    );

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
    const expected = expect.objectContaining({
      params: { q: "cats" },
      query: { page: "2" },
    });
    expect(a).toHaveBeenCalledWith(expected);
    expect(b).toHaveBeenCalledWith(expected);
  });

  it("passes the payload to beforeOpen on direct history activation", async () => {
    const beforeOpen = vi.fn();
    const profileRoute = route({
      path: "/profile/:id<number>",
      beforeOpen: [beforeOpen],
    });
    const appScope = scope();
    const history = createMemoryHistory({
      initialEntries: ["/profile/42?tab=info"],
    });
    const appRouter = router({ routes: [profileRoute] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    expect(beforeOpen).toHaveBeenCalledTimes(1);
    expect(beforeOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        params: { id: 42 },
        query: { tab: "info" },
      }),
    );
  });

  it("runs beforeOpen on direct history changes", async () => {
    const step1BeforeOpen = vi.fn();
    const step2BeforeOpen = vi.fn();
    const step1 = route({
      path: "/step1",
      beforeOpen: [step1BeforeOpen],
    });
    const step2 = route({
      path: "/step2",
      beforeOpen: [step2BeforeOpen],
    });
    const appScope = scope();
    const history = createMemoryHistory({ initialEntries: ["/step1"] });
    const appRouter = router({ routes: [step1, step2] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    expect(step1BeforeOpen).toHaveBeenCalledTimes(1);

    history.push("/step2");
    await vi.waitFor(() => expect(step2BeforeOpen).toHaveBeenCalledTimes(1));
  });

  describe("while an async guard is pending", () => {
    it("marks isPending true, then false once resolved", async () => {
      const gate: { release?: () => void } = {};
      const profile = route({
        path: "/profile/:id",
        beforeOpen: [
          () =>
            new Promise<void>((resolve) => {
              gate.release = resolve;
            }),
        ],
      });
      const appScope = scope();
      const runner = scoped(appScope);

      // activateFx (the effect) is what drives isPending via its .pending store.
      const pendingPromise = runner(() =>
        internalOf(profile).activateFx({ params: { id: "1" }, navigate: false }),
      );

      await vi.waitFor(() => expect(gate.release).toBeTypeOf("function"));
      expect(scoped(appScope, () => profile.isPending.value)).toBe(true);
      expect(scoped(appScope, () => profile.isOpened.value)).toBe(false);

      gate.release?.();
      await pendingPromise;

      await vi.waitFor(() =>
        scoped(appScope, () => {
          expect(profile.isPending.value).toBe(false);
          expect(profile.isOpened.value).toBe(true);
        }),
      );
    });

    it("keeps the current route opened until route.open resolves", async () => {
      const gate: { release?: () => void } = {};
      const home = route({ path: "/" });
      const profile = route({
        path: "/profile/:id",
        beforeOpen: [
          () =>
            new Promise<void>((resolve) => {
              gate.release = resolve;
            }),
        ],
      });
      const appScope = scope();
      const history = createMemoryHistory({ initialEntries: ["/"] });
      const appRouter = router({ routes: [home, profile] });

      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

      await vi.waitFor(() =>
        scoped(appScope, () => {
          expect(home.isOpened.value).toBe(true);
        }),
      );

      const opening = scoped(appScope, () => profile.open({ params: { id: "42" } }));

      await Promise.resolve();
      expect(gate.release).toBeTypeOf("function");

      scoped(appScope, () => {
        expect(home.isOpened.value).toBe(true);
        expect(profile.isOpened.value).toBe(false);
      });

      const release = gate.release;
      if (!release) {
        throw new Error("beforeOpen was not started");
      }
      release();
      await opening;

      await vi.waitFor(() =>
        scoped(appScope, () => {
          expect(home.isOpened.value).toBe(false);
          expect(profile.isOpened.value).toBe(true);
        }),
      );
    });
  });
});
