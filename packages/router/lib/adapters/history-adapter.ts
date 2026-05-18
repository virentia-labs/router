import type { HistoryLike, RouterAdapter, RouterSubscription } from "../types";

export function historyAdapter(history: HistoryLike): RouterAdapter {
  return {
    location: history.location,

    push: history.push.bind(history),
    replace: history.replace.bind(history),

    goBack: history.back.bind(history),
    goForward: history.forward.bind(history),

    listen(callback) {
      return normalizeSubscription(
        history.listen(({ location }) => {
          callback(location);
        }),
      );
    }
  };
}

function normalizeSubscription(unsubscribe: (() => void) | RouterSubscription): RouterSubscription {
  return typeof unsubscribe === "function"
    ? { unsubscribe }
    : unsubscribe;
}
