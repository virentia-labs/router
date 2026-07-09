import { scope, scoped } from "@virentia/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it, vi } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { Link, routesView } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("Link", () => {
  it("runs beforeOpen once and does not render the otherwise view", async () => {
    const beforeOpen = vi.fn();
    const home = route({ path: "/" });
    const profile = route({
      path: "/profile/:id",
      beforeOpen: [beforeOpen]
    });
    const appScope = scope();
    const appRouter = router({ routes: [home, profile] });

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] }))));

    const RoutesView = routesView({
      routes: [
        {
          route: home,
          view: () => (
            <Link to={profile} params={{ id: "42" }}>
              Profile
            </Link>
          )
        },
        {
          route: profile,
          view: () => <p data-testid="message">profile</p>
        }
      ],
      otherwise: () => <p data-testid="message">not found</p>
    });

    renderWithRouter(appRouter, appScope, <RoutesView />);

    await waitFor(() => expect(screen.getByText("Profile")).toBeTruthy());
    fireEvent.click(screen.getByText("Profile"));

    await waitFor(() => {
      expect(screen.getByTestId("message").textContent).toBe("profile");
      expect(beforeOpen).toHaveBeenCalledTimes(1);
    });
  });
});
