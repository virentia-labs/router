import { scope, scoped } from "@virentia/core";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { Link } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("Link", () => {
  it("runs the caller onClick before opening the route", async () => {
    const onClick = vi.fn();
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))),
    );

    renderWithRouter(
      appRouter,
      appScope,
      <Link to={profileRoute} onClick={onClick} data-testid="link">
        Profile
      </Link>,
    );

    fireEvent.click(await screen.findByTestId("link"));

    await waitFor(() => {
      expect(onClick).toHaveBeenCalledTimes(1);
      scoped(appScope, () => {
        expect(profileRoute.isOpened.value).toBe(true);
      });
    });
  });

  it("cancels navigation when the caller onClick prevents default", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))),
    );

    renderWithRouter(
      appRouter,
      appScope,
      <Link
        to={profileRoute}
        onClick={(event) => event.preventDefault()}
        data-testid="link"
      >
        Profile
      </Link>,
    );

    fireEvent.click(await screen.findByTestId("link"));
    await act(async () => {
      await Promise.resolve();
    });

    scoped(appScope, () => {
      expect(profileRoute.isOpened.value).toBe(false);
    });
  });
});
