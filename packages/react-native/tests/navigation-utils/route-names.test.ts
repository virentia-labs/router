import { describe, expect, it } from "vitest";
import { route, virtualRoute } from "@virentia/router";
import { getTabRouteName } from "../../lib/navigation-utils";

describe("getTabRouteName", () => {
  it("derives distinct names for colliding paths", () => {
    const names = [
      getTabRouteName(route({ path: "/a/b" }), 0),
      getTabRouteName(route({ path: "/a-b" }), 1),
      getTabRouteName(route({ path: "/ab" }), 2),
      getTabRouteName(route({ path: "/a/b/c" }), 3),
      getTabRouteName(route({ path: "/a-b-c" }), 4)
    ];
    expect(new Set(names).size).toBe(names.length);
  });

  it("escapes dashes so '/a/b' and '/ab' stay distinct", () => {
    const nestedRoute = route({ path: "/a/b" });
    const flatRoute = route({ path: "/ab" });

    const nestedName = getTabRouteName(nestedRoute, 0);
    const flatName = getTabRouteName(flatRoute, 1);

    expect(nestedName).toBe("a-b");
    expect(flatName).toBe("ab");
    expect(nestedName).not.toBe(flatName);
  });

  it("keeps clean names for common top-level paths", () => {
    expect(getTabRouteName(route({ path: "/home" }), 0)).toBe("home");
    expect(getTabRouteName(route({ path: "/search" }), 1)).toBe("search");
  });

  it("falls back to Tab<index> for root and pathless routes", () => {
    expect(getTabRouteName(route({ path: "/" }), 0)).toBe("Tab0");
    expect(getTabRouteName(route(), 3)).toBe("Tab3");
  });

  it("falls back to Tab<index> for a root path and a virtual route", () => {
    const rootRoute = route({ path: "/" });
    const pathlessRoute = virtualRoute({
      transformer: (payload: { id: string }) => payload
    });

    expect(getTabRouteName(rootRoute, 0)).toBe("Tab0");
    expect(getTabRouteName(pathlessRoute, 3)).toBe("Tab3");
  });
});
