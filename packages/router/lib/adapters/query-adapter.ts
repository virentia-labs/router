import type { HistoryLike, RouterAdapter, To } from "../types";

function extractLocation(location: HistoryLike["location"]) {
  const url = new URL(safeDecode(location.search || "?"), "http://router.local");

  return {
    pathname: url.pathname === "/" ? "" : url.pathname,
    search: url.search,
    hash: url.hash
  };
}

// A malformed percent-encoding must not throw and tear down the subscription.
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function queryAdapter(history: HistoryLike): RouterAdapter {
  return {
    // A getter, not a construction-time snapshot: the router reads `location`
    // right after a push to detect a blocked navigation, and must see the
    // current URL, not the one captured when the adapter was created.
    get location() {
      return extractLocation(history.location);
    },

    push(to: To) {
      history.push(toToSearch(to, history.location.pathname));
    },

    replace(to: To) {
      history.replace(toToSearch(to, history.location.pathname));
    },

    goBack() {
      history.back();
    },

    goForward() {
      history.forward();
    },

    listen(callback) {
      const subscription = history.listen(({ location }) => {
        callback(extractLocation(location));
      });

      return typeof subscription === "function" ? { unsubscribe: subscription } : subscription;
    }
  };
}

function toToSearch(to: To, currentPathname: string): string {
  if (typeof to === "string") {
    const url = new URL(currentPathname || "/", "http://router.local");
    url.search = to;
    return `${url.pathname}${url.search}${url.hash}`;
  }

  const search = `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;
  const url = new URL(currentPathname || "/", "http://router.local");
  url.search = search;

  return `${url.pathname}${url.search}${url.hash}`;
}
