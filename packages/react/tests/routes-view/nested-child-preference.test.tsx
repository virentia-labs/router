import { scope, scoped } from "@virentia/core";
import { screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("routesView nested preference", () => {
  it("prefers the child view and returns to the parent view", async () => {
    const profileRoute = route({ path: "/profile" });
    const friendsRoute = route({
      path: "/friends",
      parent: profileRoute
    });

    const appScope = scope();
    const appRouter = router({ routes: [friendsRoute, profileRoute] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/app"] }))));

    const RoutesView = routesView({
      routes: [
        {
          route: friendsRoute,
          view: () => <p data-testid="message">friends</p>
        },
        {
          route: profileRoute,
          view: () => <p data-testid="message">profile</p>
        }
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(friendsRoute, appScope);
    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("friends"));

    await openRoute(profileRoute, appScope);
    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("profile"));
  });
});
