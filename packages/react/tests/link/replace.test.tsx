import { scope, scoped } from "@virentia/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { Link } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("Link", () => {
  it("replaces the history entry when replace is set", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });
    const history = createMemoryHistory({ initialEntries: ["/"] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));
    expect(history.index).toBe(0);

    renderWithRouter(
      appRouter,
      appScope,
      <Link to={profileRoute} replace data-testid="link">
        Profile
      </Link>,
    );

    fireEvent.click(await screen.findByTestId("link"));

    await waitFor(() =>
      scoped(appScope, () => {
        expect(profileRoute.isOpened.value).toBe(true);
      }),
    );

    // A replace navigation swaps the current entry in place, so the history
    // cursor stays at index 0 instead of advancing to 1 as a push would.
    expect(history.location.pathname).toBe("/profile");
    expect(history.index).toBe(0);
  });

  it("pushes a new history entry by default", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });
    const history = createMemoryHistory({ initialEntries: ["/"] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    renderWithRouter(
      appRouter,
      appScope,
      <Link to={profileRoute} data-testid="link">
        Profile
      </Link>,
    );

    fireEvent.click(await screen.findByTestId("link"));

    await waitFor(() => expect(history.location.pathname).toBe("/profile"));
    expect(history.index).toBe(1);
  });
});
