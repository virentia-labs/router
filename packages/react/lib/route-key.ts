const ids = new WeakMap<object, number>();
let counter = 0;

/**
 * Stable per-route React key. Used as the `key` of an Outlet/routesView-rendered
 * view so React remounts when the opened route changes — even when two sibling
 * routes render the SAME component type. Without a distinct key, React reuses the
 * instance and its nested `<Outlet/>` calls `useOpenedViews` with a different
 * number of children between renders, violating the rules of hooks ("Rendered
 * more hooks than during the previous render").
 */
export function routeKey(route: object): string {
  let id = ids.get(route);

  if (id === undefined) {
    id = counter;
    counter += 1;
    ids.set(route, id);
  }

  return `virentia-route-${id}`;
}
