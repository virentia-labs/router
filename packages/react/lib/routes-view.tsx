import { createElement } from "react";
import { OutletContext } from "./context";
import { routeKey } from "./route-key";
import type { CreateRoutesViewProps } from "./types";
import { useOpenedViews } from "./use-opened-views";

export function routesView({ otherwise: Otherwise, routes }: CreateRoutesViewProps) {
  return function RoutesView() {
    const openedView = useOpenedViews(routes).at(-1);

    if (!openedView) {
      return Otherwise ? <Otherwise /> : null;
    }

    return (
      <OutletContext.Provider value={{ children: openedView.children ?? [] }}>
        {createElement(openedView.view, { key: routeKey(openedView.route) })}
      </OutletContext.Provider>
    );
  };
}
