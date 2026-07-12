import { act, render, screen, waitFor } from "@testing-library/react";
import { type ComponentType, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { route } from "@virentia/router";
import { lazyRouteView } from "../../lib";

describe("lazyRouteView", () => {
  it("wraps the lazy view in the provided layout", async () => {
    const lazyRoute = route({ path: "/lazy" });
    const Loaded: ComponentType = () => <p data-testid="loaded">loaded</p>;
    const Layout = ({ children }: { children: ReactNode }) => (
      <div>
        <span data-testid="layout">L</span>
        {children}
      </div>
    );

    const { view: View } = lazyRouteView({
      route: lazyRoute,
      view: () => Promise.resolve({ default: Loaded }),
      layout: Layout
    });

    render(<View />);

    // The layout is rendered synchronously around the suspended content.
    expect(screen.getByTestId("layout").textContent).toBe("L");
    await waitFor(() => expect(screen.getByTestId("loaded").textContent).toBe("loaded"));
  });

  it("renders nothing as the fallback when none is provided", async () => {
    const lazyRoute = route({ path: "/lazy" });
    const Loaded: ComponentType = () => <p data-testid="loaded">loaded</p>;

    let resolve!: (mod: { default: ComponentType }) => void;
    const importView = () =>
      new Promise<{ default: ComponentType }>((res) => {
        resolve = res;
      });

    const { view: View } = lazyRouteView({ route: lazyRoute, view: importView });

    const { container } = render(<View />);

    // With no fallback the Suspense boundary renders null while pending.
    expect(container.textContent).toBe("");
    expect(screen.queryByTestId("loaded")).toBeFalsy();

    await act(async () => {
      resolve({ default: Loaded });
      await new Promise((res) => setTimeout(res, 0));
    });

    await waitFor(() => expect(screen.getByTestId("loaded").textContent).toBe("loaded"));
  });
});
