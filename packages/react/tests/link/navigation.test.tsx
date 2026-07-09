import { scope, scoped } from "@virentia/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { Link, routesView } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("Link", () => {
  it("opens the route on click in the provided scope", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile/:id" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    renderWithRouter(
      appRouter,
      appScope,
      <Link to={profileRoute} params={{ id: "42" }} query={{ tab: "posts" }} data-testid="link">
        Profile
      </Link>
    );

    const anchor = await screen.findByTestId("link");
    fireEvent.click(anchor);

    await waitFor(() =>
      scoped(appScope, () => {
        expect(profileRoute.isOpened.value).toBe(true);
        expect(profileRoute.params.value.id).toBe("42");
      })
    );
  });

  it("opens the route on click when target is explicitly _self", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    renderWithRouter(
      appRouter,
      appScope,
      <Link to={profileRoute} target="_self" data-testid="link">
        Profile
      </Link>
    );

    const anchor = await screen.findByTestId("link");
    fireEvent.click(anchor);

    await waitFor(() =>
      scoped(appScope, () => {
        expect(profileRoute.isOpened.value).toBe(true);
      })
    );
  });

  it("navigates to the target route and back on successive clicks", async () => {
    const route1 = route({ path: "/app" });
    const route2 = route({ path: "/faq/:id" });
    const appScope = scope();
    const appRouter = router({ routes: [route1, route2] });
    const history = createMemoryHistory({ initialEntries: ["/app"] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    const RoutesView = routesView({
      routes: [
        {
          route: route1,
          view: () => (
            <Link params={{ id: "123" }} to={route2} id="link">
              route1
            </Link>
          )
        },
        {
          route: route2,
          view: () => (
            <Link to={route1} id="link">
              route2
            </Link>
          )
        }
      ],
      otherwise: () => <p id="message">not found</p>
    });

    const { container } = renderWithRouter(appRouter, appScope, <RoutesView />);

    await waitFor(() => expect(container.querySelector("#link")?.textContent).toBe("route1"));
    fireEvent.click(container.querySelector("#link")!);

    await waitFor(() =>
      scoped(appScope, () => {
        expect(route2.isOpened.value).toBe(true);
        expect(route2.params.value.id).toBe("123");
      }),
    );

    fireEvent.click(container.querySelector("#link")!);

    await waitFor(() =>
      scoped(appScope, () => {
        expect(route1.isOpened.value).toBe(true);
      }),
    );
  });
});
