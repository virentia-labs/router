import { describe, expect, it } from "vitest";
import { route, router, virtualRoute } from "@virentia/router";
import { hasOpen } from "../../lib/navigation-utils";

describe("hasOpen", () => {
  it("is true for a route", () => {
    expect(hasOpen(route({ path: "/a" }))).toBe(true);
  });

  it("is true for a virtual route", () => {
    expect(hasOpen(virtualRoute({ transformer: (payload: { id: string }) => payload }))).toBe(true);
  });

  it("is false for a router", () => {
    expect(hasOpen(router({ routes: [route({ path: "/a" })] }))).toBe(false);
  });
});
