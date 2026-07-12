import { describe, expect, it } from "vitest";
import { route, virtualRoute } from "@virentia/router";
import { getRouteKey, getStackRouteName } from "../../lib/navigation-utils";

describe("getStackRouteName", () => {
  it("uses the path when the route has one", () => {
    expect(getStackRouteName(route({ path: "/a/b" }), 0)).toBe("/a/b");
    expect(getStackRouteName(route({ path: "/" }), 1)).toBe("/");
  });

  it("falls back to Route<index> for a pathless route", () => {
    expect(getStackRouteName(route(), 3)).toBe("Route3");
    expect(
      getStackRouteName(virtualRoute({ transformer: (payload: { id: string }) => payload }), 5)
    ).toBe("Route5");
  });
});

describe("getRouteKey", () => {
  it("uses the path when the route has one", () => {
    expect(getRouteKey(route({ path: "/a/b" }), 0)).toBe("/a/b");
  });

  it("falls back to route-<index> for a pathless route", () => {
    expect(getRouteKey(route(), 2)).toBe("route-2");
  });
});
