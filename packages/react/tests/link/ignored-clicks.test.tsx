import { scope, scoped } from "@virentia/core";
import { act, fireEvent, screen } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { Link } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("Link", () => {
  it("ignores a modified (metaKey) click", async () => {
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
      <Link to={profileRoute} data-testid="link">
        Profile
      </Link>
    );

    const anchor = await screen.findByTestId("link");
    fireEvent.click(anchor, { metaKey: true });

    // Give any (unexpected) async navigation a chance to settle, then assert closed.
    await act(async () => {
      await Promise.resolve();
    });
    scoped(appScope, () => {
      expect(profileRoute.isOpened.value).toBe(false);
    });
  });

  it("ignores a click when target is not _self", async () => {
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
      <Link to={profileRoute} target="_blank" data-testid="link">
        Profile
      </Link>
    );

    const anchor = await screen.findByTestId("link");
    fireEvent.click(anchor);

    await act(async () => {
      await Promise.resolve();
    });
    scoped(appScope, () => {
      expect(profileRoute.isOpened.value).toBe(false);
    });
  });
});
