import { describe, expectTypeOf, it } from "vitest";
import type { ComponentProps } from "react";
import { route, router, historyAdapter } from "@virentia/router";
import { createMemoryHistory } from "history";
import { RouterProvider } from "../../lib";

const appRouter = router({ routes: [route({ path: "/" })] });
const history = historyAdapter(createMemoryHistory());

type Props = ComponentProps<typeof RouterProvider>;

// Type-level spec for <RouterProvider>.
describe("RouterProvider", () => {
  it("types router as required and history as optional", () => {
    expectTypeOf<Props["router"]>().toEqualTypeOf<typeof appRouter>();
    expectTypeOf<Props["history"]>().toEqualTypeOf<typeof history | undefined>();
  });

  it("is not typed as any", () => {
    expectTypeOf(RouterProvider).not.toBeAny();
  });

  it("accepts router, history, and children", () => {
    const ok = (
      <RouterProvider router={appRouter} history={history}>
        <span />
      </RouterProvider>
    );
    expectTypeOf(ok).not.toBeAny();
  });

  it("rejects being rendered without a router", () => {
    // @ts-expect-error `router` is required.
    const bad = <RouterProvider>content</RouterProvider>;
    expectTypeOf(bad).not.toBeAny();
  });
});
