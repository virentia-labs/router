import { scope, scoped } from "@virentia/core";
import { act, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("RouterProvider", () => {
  it("disposes the history subscription on unmount", async () => {
    const homeRoute = route({ path: "/" });
    const faqRoute = route({ path: "/faq" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, faqRoute] });
    const history = createMemoryHistory({ initialEntries: ["/"] });

    const RoutesView = routesView({
      routes: [
        { route: homeRoute, view: () => <p data-testid="message">home</p> },
        { route: faqRoute, view: () => <p data-testid="message">faq</p> }
      ],
      otherwise: () => <p data-testid="message">none</p>
    });

    const { unmount } = renderWithRouter(
      appRouter,
      appScope,
      <RoutesView />,
      historyAdapter(history),
    );

    // Mounting the provider attaches history and drives the initial match.
    await waitFor(() =>
      scoped(appScope, () => expect(homeRoute.isOpened.value).toBe(true)),
    );

    unmount();

    // After the cleanup disposes the subscription, a fresh history change is
    // no longer observed by the router, so faq never opens.
    await act(async () => {
      history.push("/faq");
      await new Promise((res) => setTimeout(res, 20));
    });

    scoped(appScope, () => {
      expect(faqRoute.isOpened.value).toBe(false);
    });
  });
});
