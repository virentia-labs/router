import { describe, expect, it } from "vitest";
import { is, route } from "../lib";

describe("is", () => {
  describe("route", () => {
    it("returns false for nullish, primitive, unbranded inputs", () => {
      expect(is.route(null)).toBe(false);
      expect(is.route(undefined)).toBe(false);
      expect(is.route(42)).toBe(false);
      expect(is.route("route")).toBe(false);
      expect(is.route({})).toBe(false);
      expect(is.route({ "@@type": "nope" })).toBe(false);
    });
  });

  describe("router", () => {
    it("returns true for a router-branded object", () => {
      expect(is.router({ "@@type": "router" })).toBe(true);
    });
  });

  describe("pathRoute", () => {
    it("distinguishes a path route from a pathless one", () => {
      expect(is.pathRoute(route({ path: "/x" }))).toBe(true);
      expect(is.pathRoute(route())).toBe(false);
    });
  });

  describe("pathlessRoute", () => {
    it("returns true for a pathless route", () => {
      expect(is.pathlessRoute(route())).toBe(true);
    });
  });
});
