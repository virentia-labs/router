import { createElement, type ReactNode } from "react";
import { OutletContext } from "./context";
import { routeKey } from "./route-key";
import type { CreateRoutesViewProps, RouteView, RouteViewGroup } from "./types";
import { useOpenedViews } from "./use-opened-views";

export function routesView({ layout: Layout, otherwise: Otherwise, routes }: CreateRoutesViewProps) {
  return function RoutesView() {
    const selected = useOpenedViews(routes).at(-1);

    let content: ReactNode;

    if (!selected) {
      content = Otherwise ? <Otherwise /> : null;
    } else if (isRouteViewGroup(selected)) {
      // A group: render it through the internal group view, keyed by the group
      // route so its shared layout persists while switching between members.
      content = createElement(RouteGroupView, { group: selected, key: routeKey(selected.route) });
    } else {
      content = renderView(selected);
    }

    // A routesView-level layout wraps the whole output OUTSIDE the keyed view, so
    // it stays mounted across route changes instead of re-mounting per route.
    return Layout ? <Layout>{content}</Layout> : content;
  };
}

function RouteGroupView({ group }: { group: RouteViewGroup }) {
  const Layout = group.layout;
  const openedView = useOpenedViews(group.views).at(-1);
  const inner = openedView ? renderView(openedView) : null;

  return Layout ? <Layout>{inner}</Layout> : inner;
}

function isRouteViewGroup(item: RouteView | RouteViewGroup): item is RouteViewGroup {
  return "views" in item;
}

function renderView(view: RouteView): ReactNode {
  return (
    <OutletContext.Provider value={{ children: view.children ?? [] }}>
      {createElement(view.view, { key: routeKey(view.route) })}
    </OutletContext.Provider>
  );
}
