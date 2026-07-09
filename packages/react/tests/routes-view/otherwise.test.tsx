import { scope, scoped } from "@virentia/core";
import { act, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("routesView otherwise", () => {
  it("renders the otherwise view when nothing matches", async () => {
    const homeRoute = route({ path: "/" });
    const faqRoute = route({ path: "/faq" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, faqRoute] });
    const history = createMemoryHistory({ initialEntries: ["/faq"] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    const RoutesView = routesView({
      routes: [
        { route: homeRoute, view: () => <p data-testid="message">home</p> },
        { route: faqRoute, view: () => <p data-testid="message">faq</p> }
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("faq"));

    act(() => {
      history.push("/nowhere");
    });

    await waitFor(() => expect(screen.getByTestId("message").textContent).toBe("not found"));
  });

  it("renders nothing when no match and no otherwise is given", async () => {
    const homeRoute = route({ path: "/" });
    const faqRoute = route({ path: "/faq" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, faqRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/nowhere"] })))
    );

    const RoutesView = routesView({
      routes: [
        { route: homeRoute, view: () => <p data-testid="message">home</p> },
        { route: faqRoute, view: () => <p data-testid="message">faq</p> }
      ]
    });

    const { container } = renderWithRouter(appRouter, appScope, <RoutesView />);

    await waitFor(() =>
      scoped(appScope, () => {
        expect(homeRoute.isOpened.value).toBe(false);
        expect(faqRoute.isOpened.value).toBe(false);
      })
    );
    expect(container.querySelector("[data-testid='message']")).toBeFalsy();
  });
});
