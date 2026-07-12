import { scope, scoped } from "@virentia/core";
import { act, fireEvent, screen } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { Link } from "../../lib";
import { renderWithRouter } from "../support/render";

async function setup() {
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
    <Link to={profileRoute} data-testid="link">
      Profile
    </Link>,
  );

  return { appScope, profileRoute };
}

async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("Link", () => {
  it("ignores an altKey click", async () => {
    const { appScope, profileRoute } = await setup();

    fireEvent.click(await screen.findByTestId("link"), { altKey: true });
    await settle();

    scoped(appScope, () => {
      expect(profileRoute.isOpened.value).toBe(false);
    });
  });

  it("ignores a ctrlKey click", async () => {
    const { appScope, profileRoute } = await setup();

    fireEvent.click(await screen.findByTestId("link"), { ctrlKey: true });
    await settle();

    scoped(appScope, () => {
      expect(profileRoute.isOpened.value).toBe(false);
    });
  });

  it("ignores a shiftKey click", async () => {
    const { appScope, profileRoute } = await setup();

    fireEvent.click(await screen.findByTestId("link"), { shiftKey: true });
    await settle();

    scoped(appScope, () => {
      expect(profileRoute.isOpened.value).toBe(false);
    });
  });
});
