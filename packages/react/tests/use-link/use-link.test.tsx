import { scope, scoped } from "@virentia/core";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { useLink } from "../../lib";
import { renderWithRouter } from "../support/render";

describe("useLink", () => {
  it("returns the built path and opens the route in the provided scope", async () => {
    const homeRoute = route({ path: "/" });
    const profileRoute = route({ path: "/profile/:id" });
    const appScope = scope();
    const appRouter = router({ routes: [homeRoute, profileRoute] });

    await scoped(appScope, () =>
      appRouter.setHistory(historyAdapter(createMemoryHistory({ initialEntries: ["/"] })))
    );

    function Probe() {
      const link = useLink(profileRoute, { id: "7" }, { q: "x" });
      return (
        <button
          type="button"
          data-testid="probe"
          data-path={link.path}
          onClick={() => void link.open({ params: { id: "7" } })}
        >
          go
        </button>
      );
    }

    renderWithRouter(appRouter, appScope, <Probe />);

    const btn = await screen.findByTestId("probe");
    expect(btn.getAttribute("data-path")).toBe("/profile/7?q=x");

    fireEvent.click(btn);

    await waitFor(() =>
      scoped(appScope, () => {
        expect(profileRoute.isOpened.value).toBe(true);
        expect(profileRoute.params.value.id).toBe("7");
      })
    );
  });
});
