import { scope, scoped } from "@virentia/core";
import { screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { useIsOpened } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("useIsOpened", () => {
  it("reflects a route's opened state reactively", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    function Probe() {
      const opened = useIsOpened(profileRoute);
      return <span data-testid="state">{opened ? "open" : "closed"}</span>;
    }

    renderWithRouter(appRouter, appScope, <Probe />);

    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("closed"));

    await openRoute(profileRoute, appScope);
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("open"));
  });

  it("reflects whether any of a Router's routes are active", async () => {
    const homeRoute = route({ path: "/" });
    const productsRoute = route({ path: "/products" });
    const shopRouter = router({ routes: [productsRoute] });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, shopRouter] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    function Probe() {
      const opened = useIsOpened(shopRouter);
      return <span data-testid="router-state">{opened ? "active" : "inactive"}</span>;
    }

    renderWithRouter(appRouter, appScope, <Probe />);

    await waitFor(() => expect(screen.getByTestId("router-state").textContent).toBe("inactive"));

    await openRoute(productsRoute, appScope);
    await waitFor(() => expect(screen.getByTestId("router-state").textContent).toBe("active"));
  });
});
