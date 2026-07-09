import { event, reaction, scope, scoped, store } from "@virentia/core";
import { act, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import {
  chainRoute,
  route,
  router,
  historyAdapter,
  type RouteOpenedPayload
} from "@virentia/router";
import { routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("chainRoute integration", () => {
  it("chooses the redirected profile view, then the auth view once rejected", async () => {
    interface User {
      id: number;
      name: string;
    }

    const authRoute = route({ path: "/auth" });
    const profileRoute = route({ path: "/profile" });
    const user = store<User | null>({ id: 1, name: "edward" });

    const authorizationCheckStarted = event<RouteOpenedPayload<void>>();
    const authorized = event<void>();
    const rejected = event<void>();

    reaction({
      on: authorizationCheckStarted,
      run() {
        void (user.value ? authorized : rejected)();
      }
    });

    const chainedRoute = chainRoute({
      route: authRoute,
      beforeOpen: authorizationCheckStarted,
      openOn: rejected,
      cancelOn: authorized
    });

    reaction({
      on: chainedRoute.cancelled,
      run() {
        void profileRoute.open({});
      }
    });

    const appScope = scope();
    const appRouter = router({ routes: [authRoute, profileRoute] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/app"] }))));

    const RoutesView = routesView({
      routes: [
        {
          route: chainedRoute,
          view: () => <p data-testid="message">auth</p>
        },
        {
          route: profileRoute,
          view: () => <p data-testid="message">profile</p>
        }
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(authRoute, appScope);
    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("profile"));

    await act(async () => {
      await scoped(appScope, () => {
        user.value = null;
      });
      await scoped(appScope, () => authRoute.open({}));
    });

    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("auth"));
  });
});
