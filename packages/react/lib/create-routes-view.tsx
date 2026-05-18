import { createElement } from "react";
import { OutletContext } from "./context";
import type { CreateRoutesViewProps } from "./types";
import { useOpenedViews } from "./use-opened-views";

export function createRoutesView({ otherwise: Otherwise, routes }: CreateRoutesViewProps) {
  return function RoutesView() {
    const openedView = useOpenedViews(routes).at(-1);

    if (!openedView) {
      return Otherwise ? <Otherwise /> : null;
    }

    return (
      <OutletContext.Provider value={{ children: openedView.children ?? [] }}>
        {createElement(openedView.view)}
      </OutletContext.Provider>
    );
  };
}
