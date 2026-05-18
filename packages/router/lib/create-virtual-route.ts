import { computed, event, reaction, store, type Store } from "@virentia/core";
import type { VirtualRoute } from "./types";
import { writeStore } from "./utils";

interface VirtualRouteOptions<T, TransformerResult> {
  isPending?: Store<boolean>;
  transformer?: (payload: T) => TransformerResult;
}

export function createVirtualRoute<T = void, TransformerResult = void>(
  options: VirtualRouteOptions<T, TransformerResult> = {},
): VirtualRoute<T, TransformerResult> {
  const {
    isPending = computed(() => false),
    transformer = (payload) => (payload ?? null) as TransformerResult
  } = options;

  const params = store<TransformerResult>(null as TransformerResult);
  const isOpened = store<boolean>(false);

  const open = event<T>();
  const opened = event<T>();
  const openedOnServer = event<T>();
  const openedOnClient = event<T>();
  const close = event<void>();
  const closed = event<void>();
  const cancelled = event<void>();

  reaction({
    on: open,
    run(payload) {
      writeStore(params, transformer(payload));
      writeStore(isOpened, true);

      if (typeof window === "undefined") {
        void openedOnServer(payload);
      } else {
        void openedOnClient(payload);
      }

      void opened(payload);
    }
  });

  reaction({
    on: close,
    run() {
      if (!isOpened.value) {
        return;
      }

      writeStore(isOpened, false);
      void closed();
    }
  });

  return {
    "@@type": "pathless-route",

    params,
    isOpened,
    isPending,

    open,
    opened,
    openedOnServer,
    openedOnClient,

    close,
    closed,
    cancelled,

    path: "",

    units: {
      params,
      isOpened,
      isPending,
      onOpen: open,
      onClose: close
    }
  };
}
