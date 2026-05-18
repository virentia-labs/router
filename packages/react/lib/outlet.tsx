import { createElement, useContext } from "react";
import { OutletContext } from "./context";
import { useOpenedViews } from "./use-opened-views";

export function Outlet() {
  const outlet = useContext(OutletContext);
  const openedView = useOpenedViews(outlet?.children ?? []).at(-1);

  return openedView ? createElement(openedView.view) : null;
}
