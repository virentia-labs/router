import type { HistoryLike, RouterAdapter, RouterSubscription } from "../types";

export function historyAdapter(history: HistoryLike): RouterAdapter {
  return {
    // A getter, not a snapshot: the router reads `location` right after a push to
    // detect a blocked navigation, so it must reflect the live history location.
    get location() {
      return history.location;
    },

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
  if (typeof unsubscribe === "function") {
    return { unsubscribe };
  }

  // Guard against a history that returns neither a function nor a subscription
  // object: hand back a no-op so `.unsubscribe()` never throws.
  if (unsubscribe && typeof unsubscribe.unsubscribe === "function") {
    return unsubscribe;
  }

  return { unsubscribe() {} };
}
