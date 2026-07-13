import { group } from "@virentia/router";
import type { CreateRouteViewGroupProps, RouteViewGroup } from "./types";

// Combines several route views under one shared layout. Their routes are merged
// into a single `group`, so the group is "opened" while ANY member is active.
// This is DATA only — routesView is the single place that renders it: it keys the
// shared layout by the group route, so the layout stays mounted (not remounted)
// while navigation moves between members, and only the inner view swaps.
export function routeViewGroup(props: CreateRouteViewGroupProps): RouteViewGroup {
  const { layout, views } = props;
  const route = group(views.map((view) => view.route) as Parameters<typeof group>[0]);

  return layout ? { route, views, layout } : { route, views };
}
