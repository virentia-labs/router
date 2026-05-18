import { useMemo } from "react";
import { is } from "@virentia/router";
import type { RouteView } from "./types";
import { useIsOpened } from "./use-is-opened";

export function useOpenedViews(routes: RouteView[]): RouteView[] {
  const visibilities = routes.map((view) => useIsOpened(view.route));

  return useMemo(() => {
    const opened = routes.filter((_view, index) => visibilities[index]);

    return opened.reduce(
      (result, view) =>
        result.filter((candidate) => {
          if (is.router(view.route) || is.router(candidate.route)) {
            return true;
          }

          const parent = "parent" in view.route ? view.route.parent : undefined;

          return candidate.route !== parent;
        }),
      opened,
    );
  }, [routes, ...visibilities]);
}
