import type { Store } from "@virentia/core";
import { staticModel, type InstanceOf } from "@virentia/core/models";
import { route, router } from "../../lib";

const Screen = staticModel({ setup() {
  const page = route({ path: "/users/:id<number>" });
  return { page, navigation: router({ routes: [page] }) };
} });
declare const screen: InstanceOf<typeof Screen>;
const params: Store<{ id: number }> = screen.page.params;
screen.page.open({ params: { id: 42 } });
// @ts-expect-error bound routes preserve their typed path parameters
screen.page.open({ params: { id: "42" } });
// @ts-expect-error a parameterized route still requires params
screen.page.open();
const path: Store<string> = screen.navigation.path;
void [params, path];
