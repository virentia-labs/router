import { createElement, type ComponentType, type ReactNode } from "react";
import type { RouteView } from "./types";

export function withLayout(
  layout: ComponentType<{ children: ReactNode }>,
  views: RouteView[],
): RouteView[] {
  const Layout = layout;

  return views.map(({ children, route, view }) => {
    const routeView: RouteView = {
      route,
      view: () => <Layout>{createElement(view)}</Layout>
    };

    if (children !== undefined) {
      routeView.children = children;
    }

    return routeView;
  });
}
