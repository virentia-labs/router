import { createElement, useContext } from "react";
import { OutletContext } from "./context";
import { routeKey } from "./route-key";
import { useOpenedViews } from "./use-opened-views";

export function Outlet() {
  const outlet = useContext(OutletContext);
  const openedView = useOpenedViews(outlet?.children ?? []).at(-1);

  if (!openedView) {
    return null;
  }

  // Re-provide the context scoped to the SELECTED view's children, so a nested
  // <Outlet/> inside that view renders its own children instead of re-reading
  // this level's — which otherwise re-selects the same view and recurses forever.
  return createElement(
    OutletContext.Provider,
    { value: { children: openedView.children ?? [] } },
    createElement(openedView.view, { key: routeKey(openedView.route) }),
  );
}
