import { scope, scoped } from "@virentia/core";
import { screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { useEffect, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routeViewGroup, routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

// The routing config (routes + routeViewGroup + routesView) is built BEFORE the
// scope is forked — the same module-scope-before-fork order route()/router()/
// group() require, so the group's units are part of the forked scope's graph.
describe("routeViewGroup", () => {
  it("keeps one shared layout mounted while switching between members", async () => {
    const a = route({ path: "/a" });
    const b = route({ path: "/b" });
    const c = route({ path: "/c" });

    let mounts = 0;
    const Layout = ({ children }: { children: ReactNode }) => {
      useEffect(() => {
        mounts += 1;
      }, []);
      return (
        <div>
          <span data-testid="group-layout">GL</span>
          {children}
        </div>
      );
    };

    const grouped = routeViewGroup({
      layout: Layout,
      views: [
        { route: a, view: () => <p data-testid="page">A</p> },
        { route: b, view: () => <p data-testid="page">B</p> }
      ]
    });
    const RoutesView = routesView({
      routes: [grouped, { route: c, view: () => <p data-testid="page">C</p> }]
    });

    const appScope = scope();
    const appRouter = router({ routes: [a, b, c] });
    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/a"] }))),
    );

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(a, appScope);
    await waitFor(() => {
      expect(screen.getByTestId("group-layout")).toBeTruthy();
      expect(screen.getByTestId("page").textContent).toBe("A");
    });

    // Switching WITHIN the group swaps the inner view but keeps the layout mounted.
    await openRoute(b, appScope);
    await waitFor(() => expect(screen.getByTestId("page").textContent).toBe("B"));
    expect(screen.getByTestId("group-layout")).toBeTruthy();
    expect(mounts).toBe(1);
  });

  it("unmounts the shared layout when navigation leaves the group and remounts on return", async () => {
    const a = route({ path: "/a" });
    const b = route({ path: "/b" });
    const c = route({ path: "/c" });

    let mounts = 0;
    const Layout = ({ children }: { children: ReactNode }) => {
      useEffect(() => {
        mounts += 1;
      }, []);
      return (
        <div>
          <span data-testid="group-layout">GL</span>
          {children}
        </div>
      );
    };

    const grouped = routeViewGroup({
      layout: Layout,
      views: [
        { route: a, view: () => <p data-testid="page">A</p> },
        { route: b, view: () => <p data-testid="page">B</p> }
      ]
    });
    const RoutesView = routesView({
      routes: [grouped, { route: c, view: () => <p data-testid="page">C</p> }]
    });

    const appScope = scope();
    const appRouter = router({ routes: [a, b, c] });
    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/a"] }))),
    );

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(a, appScope);
    await waitFor(() => expect(screen.getByTestId("group-layout")).toBeTruthy());

    await openRoute(c, appScope);
    await waitFor(() => expect(screen.getByTestId("page").textContent).toBe("C"));
    expect(screen.queryByTestId("group-layout")).toBeFalsy();

    await openRoute(a, appScope);
    await waitFor(() => expect(screen.getByTestId("page").textContent).toBe("A"));
    expect(mounts).toBe(2);
  });
});
