import { useMemo } from "react";
import { is } from "@virentia/router";
import type { RouteView } from "./types";
import { useIsOpened } from "./use-is-opened";

export function useOpenedViews(routes: RouteView[]): RouteView[] {
  const visibilities = routes.map((view) => useIsOpened(view.route));

  return useMemo(() => {
    const opened = routes.filter((_view, index) => visibilities[index]);

    return opened.reduce((result, view) => {
      // Collect the full ancestor chain, not just the direct parent, so an
      // opened grandchild eliminates a listed grandparent even when the
      // intermediate parent is absent from the view list.
      const ancestors = new Set<unknown>();
      let cursor: unknown = "parent" in view.route ? view.route.parent : undefined;

      while (cursor) {
        ancestors.add(cursor);
        cursor =
          typeof cursor === "object" && cursor !== null && "parent" in cursor
            ? (cursor as { parent?: unknown }).parent
            : undefined;
      }

      return result.filter((candidate) => {
        if (is.router(view.route) || is.router(candidate.route)) {
          return true;
        }

        return !ancestors.has(candidate.route);
      });
    }, opened);
  }, [routes, ...visibilities]);
}
