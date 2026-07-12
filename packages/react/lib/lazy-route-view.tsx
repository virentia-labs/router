import { lazy, Suspense } from "react";
import type { AsyncBundleImport } from "@virentia/router";
import type { CreateLazyRouteViewProps, RouteView } from "./types";

export function lazyRouteView<T extends object | void = void>(
  props: CreateLazyRouteViewProps<T>,
): RouteView {
  const { fallback: Fallback, layout: Layout, view: importView } = props;
  const LazyView = lazy(importView);
  const internalRoute = props.route as {
    internal?: { setAsyncImport?: (value: AsyncBundleImport) => void };
  };

  // A Router also has `internal`, but no setAsyncImport — guard the method itself,
  // not just the presence of `internal`, so a lazy view over a Router doesn't crash.
  if (typeof internalRoute.internal?.setAsyncImport === "function") {
    internalRoute.internal.setAsyncImport(importView as AsyncBundleImport);
  }

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
