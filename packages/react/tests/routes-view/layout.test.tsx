import { scope, scoped } from "@virentia/core";
import { act, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { useEffect, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("routesView", () => {
  describe("with a layout", () => {
    it("wraps the matched view in the layout", async () => {
      const home = route({ path: "/" });
      const appScope = scope();
      const appRouter = router({ routes: [home] });
      await scoped(appScope, () =>
        appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))),
      );

      const Layout = ({ children }: { children: ReactNode }) => (
        <div>
          <span data-testid="shell">shell</span>
          {children}
        </div>
      );
      const RoutesView = routesView({
        layout: Layout,
        routes: [{ route: home, view: () => <p data-testid="page">home</p> }]
      });

      renderWithRouter(appRouter, appScope, <RoutesView />);
      await openRoute(home, appScope);
      await waitFor(() => {
        expect(screen.getByTestId("shell").textContent).toBe("shell");
        expect(screen.getByTestId("page").textContent).toBe("home");
      });
    });

    it("keeps the layout mounted across route changes", async () => {
      const a = route({ path: "/a" });
      const b = route({ path: "/b" });
      const appScope = scope();
      const appRouter = router({ routes: [a, b] });
      await scoped(appScope, () =>
        appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/a"] }))),
      );

      let mounts = 0;
      const Layout = ({ children }: { children: ReactNode }) => {
        useEffect(() => {
          mounts += 1;
        }, []);
        return (
          <div>
            <span data-testid="shell">shell</span>
            {children}
          </div>
        );
      };
      const RoutesView = routesView({
        layout: Layout,
        routes: [
          { route: a, view: () => <p data-testid="page">A</p> },
          { route: b, view: () => <p data-testid="page">B</p> }
        ]
      });

      renderWithRouter(appRouter, appScope, <RoutesView />);
      await openRoute(a, appScope);
      await waitFor(() => expect(screen.getByTestId("page").textContent).toBe("A"));

      await openRoute(b, appScope);
      await waitFor(() => expect(screen.getByTestId("page").textContent).toBe("B"));

      expect(mounts).toBe(1);
    });

    it("renders the otherwise fallback inside the layout", async () => {
      const home = route({ path: "/" });
      const appScope = scope();
      const appRouter = router({ routes: [home] });
      const history = createMemoryHistory({ initialEntries: ["/"] });
      await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

      const Layout = ({ children }: { children: ReactNode }) => (
        <div>
          <span data-testid="shell">shell</span>
          {children}
        </div>
      );
      const RoutesView = routesView({
        layout: Layout,
        routes: [{ route: home, view: () => <p data-testid="page">home</p> }],
        otherwise: () => <p data-testid="page">not found</p>
      });

      renderWithRouter(appRouter, appScope, <RoutesView />);
      act(() => {
        history.push("/nowhere");
      });
      await waitFor(() => {
        expect(screen.getByTestId("shell").textContent).toBe("shell");
        expect(screen.getByTestId("page").textContent).toBe("not found");
      });
    });
  });
});
