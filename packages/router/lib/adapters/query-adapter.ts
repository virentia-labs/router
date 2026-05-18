import type { HistoryLike, RouterAdapter, To } from "../types";

function extractLocation(location: HistoryLike["location"]) {
  const url = new URL(decodeURIComponent(location.search || "?"), "http://router.local");

  return {
    pathname: url.pathname === "/" ? "" : url.pathname,
    search: url.search,
    hash: url.hash
  };
}

export function queryAdapter(history: HistoryLike): RouterAdapter {
  return {
    location: extractLocation(history.location),

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
