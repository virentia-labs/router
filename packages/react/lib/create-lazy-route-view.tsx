import { lazy, Suspense } from "react";
import type { AsyncBundleImport } from "@virentia/router";
import type { CreateLazyRouteViewProps, RouteView } from "./types";

export function createLazyRouteView<T extends object | void = void>(
  props: CreateLazyRouteViewProps<T>,
): RouteView {
  const { fallback: Fallback, layout: Layout, view: importView } = props;
  const LazyView = lazy(importView);
  const internalRoute = props.route as {
    internal?: { setAsyncImport(value: AsyncBundleImport): void };
  };

  internalRoute.internal?.setAsyncImport(importView as AsyncBundleImport);

  const view = function LazyRouteView() {
    const content = (
      <Suspense fallback={Fallback ? <Fallback /> : null}>
        <LazyView />
      </Suspense>
    );

    return Layout ? <Layout>{content}</Layout> : content;
  };

  const routeView: RouteView = {
    route: props.route,
    view
  };

  if (props.children !== undefined) {
    routeView.children = props.children;
  }

  return routeView;
}
