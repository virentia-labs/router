import { describe, expectTypeOf, it } from "vitest";
import { route } from "@virentia/router";
import { withLayout } from "../../lib";
import type { RouteView } from "../../lib";

const homeRoute = route({ path: "/" });
const Layout = ({ children }: { children: React.ReactNode }) => children;
const views: RouteView[] = [{ route: homeRoute, view: () => null }];

// Type-level spec for withLayout.
describe("withLayout", () => {
  it("returns a RouteView list", () => {
    expectTypeOf(withLayout(Layout, views)).toEqualTypeOf<RouteView[]>();
    expectTypeOf(withLayout(Layout, views)).not.toBeAny();
  });

  it("accepts a layout component and a views list", () => {
    expectTypeOf(withLayout).toBeCallableWith(Layout, views);
  });

  it("rejects a layout whose props lack children", () => {
    // @ts-expect-error the layout must accept a `children` prop.
    withLayout((_props: { title: string }) => null, views);
  });

  it("rejects views passed as the first argument", () => {
    // @ts-expect-error argument order is (layout, views).
    withLayout(views, Layout);
  });
});
