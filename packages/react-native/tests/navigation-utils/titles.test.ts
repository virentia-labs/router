import { describe, expect, it } from "vitest";
import { route } from "@virentia/router";
import { getTabTitle } from "../../lib/navigation-utils";

describe("getTabTitle", () => {
  it("prefers the last static segment", () => {
    expect(getTabTitle(route({ path: "/a/b" }), 0)).toBe("b");
    expect(getTabTitle(route({ path: "/ab" }), 1)).toBe("ab");
    expect(getTabTitle(route({ path: "/profile/:id" }), 2)).toBe("profile");
    expect(getTabTitle(route({ path: "/" }), 4)).toBe("Tab 5");
  });

  it("falls back to Tab<index+1> when every segment is dynamic", () => {
    expect(getTabTitle(route({ path: "/:id" }), 0)).toBe("Tab 1");
    expect(getTabTitle(route({ path: "/:a/:b" }), 2)).toBe("Tab 3");
  });

  it("falls back to Tab<index+1> for a pathless route", () => {
    expect(getTabTitle(route(), 1)).toBe("Tab 2");
  });
});
