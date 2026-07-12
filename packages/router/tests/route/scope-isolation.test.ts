import { scope, scoped } from "@virentia/core";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { historyAdapter, route, router } from "../../lib";
import type { InternalRoute, Route } from "../../lib";

function internalOf<T extends object | void>(r: Route<T>): InternalRoute<T>["internal"] {
  return (r as unknown as InternalRoute<T>).internal;
}

describe("route scope isolation", () => {
  it("keeps a route opened in one scope closed in another", async () => {
    const r = route({ path: "/r/:id" });
    const scopeA = scope();
    const scopeB = scope();
    const appRouter = router({ routes: [r] });

    await scoped(scopeA, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );
    await scoped(scopeB, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    await scoped(scopeA, () => r.open({ params: { id: "1" } }));
    await vi.waitFor(() => scoped(scopeA, () => expect(r.isOpened.value).toBe(true)));

    expect(scoped(scopeA, () => r.isOpened.value)).toBe(true);
    expect(scoped(scopeB, () => r.isOpened.value)).toBe(false);
    expect(scoped(scopeA, () => r.params.value.id)).toBe("1");
  });

  it("keeps activation state and params per-scope, closing one without the other", async () => {
    const r = route({ path: "/r/:id" });
    const scopeA = scope();
    const scopeB = scope();
    const runnerA = scoped(scopeA);
    const runnerB = scoped(scopeB);

    await runnerA(() =>
      internalOf(r).activateRoute({ params: { id: "a" }, navigate: false }, runnerA),
    );
    await runnerB(() =>
      internalOf(r).activateRoute({ params: { id: "b" }, navigate: false }, runnerB),
    );

    expect(scoped(scopeA, () => r.isOpened.value)).toBe(true);
    expect(scoped(scopeB, () => r.isOpened.value)).toBe(true);
    expect(scoped(scopeA, () => r.params.value.id)).toBe("a");
    expect(scoped(scopeB, () => r.params.value.id)).toBe("b");

    // closing in scope A leaves scope B untouched
    await scoped(scopeA, () => internalOf(r).close());
    expect(scoped(scopeA, () => r.isOpened.value)).toBe(false);
    expect(scoped(scopeB, () => r.isOpened.value)).toBe(true);
    expect(scoped(scopeB, () => r.params.value.id)).toBe("b");
  });

  it("leaves a route closed in a scope where it never activated", async () => {
    const r = route({ path: "/r/:id" });
    const scopeA = scope();
    const scopeB = scope();
    const runnerA = scoped(scopeA);

    await runnerA(() =>
      internalOf(r).activateRoute({ params: { id: "1" }, navigate: false }, runnerA),
    );

    expect(scoped(scopeA, () => r.isOpened.value)).toBe(true);
    expect(scoped(scopeB, () => r.isOpened.value)).toBe(false);
    // params fall back to the default ({}) in the untouched scope
    expect(scoped(scopeB, () => r.params.value.id)).toBeUndefined();
  });
});
