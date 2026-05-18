import { computed, reaction } from "@virentia/core";
import { createVirtualRoute } from "./create-virtual-route";
import type { Route, VirtualRoute } from "./types";

type GroupableRoute = Route<any> | VirtualRoute<any, any>;

export function group(routes: GroupableRoute[]): VirtualRoute<void, void> {
  const isPending = computed(() => routes.some((route) => route.isPending.value));
  const virtual = createVirtualRoute<void, void>({ isPending });

  reaction(() => {
    const anyOpened = routes.some((route) => route.isOpened.value);

    if (anyOpened && !virtual.isOpened.value) {
      void virtual.open();
      return;
    }

    if (!anyOpened && virtual.isOpened.value) {
      void virtual.close();
    }
  });

  return virtual;
}
