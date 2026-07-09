import { scope, scoped } from "@virentia/core";
import { act, waitFor } from "@testing-library/react";
import { createMemoryHistory } from "history";
import { describe, expect, it } from "vitest";
import { route, router, historyAdapter } from "@virentia/router";
import { routesView } from "../../lib";
import { openRoute, renderWithRouter } from "../support/render";

describe("routesView", () => {
  it("swaps the rendered view as the active path changes", async () => {
    const route1 = route({ path: "/app" });
    const route2 = route({ path: "/faq" });
    const appScope = scope();
    const appRouter = router({ routes: [route1, route2] });
    const history = createMemoryHistory();

    await scoped(appScope, () => appRouter.setHistory(historyAdapter(history)));

    const RoutesView = routesView({
      routes: [
        { route: route1, view: () => <p id="message">route1</p> },
        { route: route2, view: () => <p id="message">route2</p> }
      ],
      otherwise: () => <p id="message">not found</p>
    });

    const { container } = renderWithRouter(appRouter, appScope, <RoutesView />);

    await openRoute(route1, appScope);
    await waitFor(() => expect(container.querySelector("#message")?.textContent).toBe("route1"));

    await openRoute(route2, appScope);
    await waitFor(() => expect(container.querySelector("#message")?.textContent).toBe("route2"));

    act(() => {
      history.push("/not-found");
    });

    await waitFor(() =>
      expect(container.querySelector("#message")?.textContent).toBe("not found"),
    );
  });
});
