import type { CreateRouteViewProps, RouteView } from "./types";

export function createRouteView<T extends object | void = void>(
  props: CreateRouteViewProps<T>,
): RouteView {
  const { children, layout: Layout, view: View } = props;

  const view = Layout
    ? function RouteViewWithLayout() {
        return (
          <Layout>
            <View />
          </Layout>
        );
      }
    : View;

  const routeView: RouteView = {
    route: props.route,
    view
  };

  if (children !== undefined) {
    routeView.children = children;
  }

  return routeView;
}
