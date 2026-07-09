import { scope, scoped } from "@virentia/core";
import { screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("RouterProvider", () => {
  it("attaches history on mount and opens the initial route", async () => {
    const homeRoute = route({ path: "/" });
    const faqRoute = route({ path: "/faq" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, faqRoute] });

    const RoutesView = routesView({
      routes: [
        { route: homeRoute, view: () => <p data-testid="message">home</p> },
        { route: faqRoute, view: () => <p data-testid="message">faq</p> }
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    // History is supplied to the provider (NOT set up manually beforehand),
    // so mounting the provider is what attaches it and drives the first match.
    renderWithRouter(
      appRouter,
      appScope,
      <RoutesView />,
      historyAdapter(createMemoryHistory({ initialEntries: ["/faq"] }))
    );

    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("faq"));
    await waitFor(() =>
      scoped(appScope, () => {
        expect(faqRoute.isOpened.value).toBe(true);
        expect(homeRoute.isOpened.value).toBe(false);
      })
    );
  });
});
