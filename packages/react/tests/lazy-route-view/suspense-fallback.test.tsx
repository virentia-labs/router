import { scope, scoped } from "@virentia/core";
import { act, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { type ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { lazyRouteView, routesView } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("lazyRouteView", () => {
  it("shows the fallback while loading, then the resolved lazy view", async () => {
    const homeRoute = route({ path: "/" });
    const lazyRoute = route({ path: "/lazy" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, lazyRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    // `lazyRouteView` registers the import as a route preloader too, so the
    // route only ACTIVATES once a preloader import resolves. We therefore hand
    // out a fresh promise per import call: the preloader calls (made before the
    // view mounts) get resolved to unblock activation, while React.lazy's own
    // call — made LAST, at mount — is left pending so the Suspense fallback is
    // observable, then resolved to reveal the view.
    const Loaded: ComponentType = () => <p data-testid="loaded">loaded lazily</p>;
    const resolvers: Array<(mod: { default: ComponentType }) => void> = [];
    const importView = () =>
      new Promise<{ default: ComponentType }>((resolve) => {
        resolvers.push(resolve);
      });

    const RoutesView = routesView({
      routes: [
        { route: homeRoute, view: () => <p data-testid="home">home</p> },
        lazyRouteView({
          route: lazyRoute,
          view: importView,
          fallback: () => <p data-testid="fallback">loading</p>
        })
      ]
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    // Fire navigation WITHOUT awaiting: `scoped(...)` awaits the whole effect
    // chain, which for a lazy route blocks on the preloader import — we resolve
    // that below to drive activation forward.
    void scoped(appScope, () => lazyRoute.open({}));

    // Resolve preloader-side imports (created before mount) until the view
    // mounts and shows the fallback. React.lazy's own import is created LAST,
    // at mount, so it is never in `pending` here and stays open -> fallback.
    for (let i = 0; i < 20 && !screen.queryByTestId("fallback"); i++) {
      const pending = [...resolvers];
      // eslint-disable-next-line no-await-in-loop
      await act(async () => {
        pending.forEach((resolve) => resolve({ default: Loaded }));
        await new Promise((res) => setTimeout(res, 0));
      });
    }

    // Fallback is shown while React.lazy's own import is still pending.
    expect(screen.getByTestId("fallback").textContent).toBe("loading");
    expect(screen.queryByTestId("loaded")).toBeFalsy();

    // Resolve the remaining (React.lazy) import to reveal the view.
    await act(async () => {
      resolvers.forEach((resolve) => resolve({ default: Loaded }));
      await new Promise((res) => setTimeout(res, 0));
    });

    await waitFor(() => expect(screen.getByTestId("loaded").textContent).toBe("loaded lazily"));
    expect(screen.queryByTestId("fallback")).toBeFalsy();
  });
});
