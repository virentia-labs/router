import { scope, scoped } from "@virentia/core";
import { screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { Link } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("Link", () => {
  it("renders an href from the built path with params and query", async () => {
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
    expect(anchor.getAttribute("href")).toBe("/profile/42?tab=posts");
  });

  it("renders the href for a Link looked up by its text content", async () => {
    const home = route({ path: "/" });
    const profile = route({ path: "/profile/:id" });
    const appRouter = router({ routes: [home, profile] });
    const appScope = scope();

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))));

    renderWithRouter(
      appRouter,
      appScope,
      <Link to={profile} params={{ id: "42" }} query={{ tab: "posts" }}>
        Profile
      </Link>,
    );

    await waitFor(() => expect(screen.getByText("Profile").getAttribute("href")).toBe("/profile/42?tab=posts"));
  });
});
