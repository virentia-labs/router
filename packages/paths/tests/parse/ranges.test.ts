import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("a {min,max} range param", () => {
    it("enforces the segment-count bounds for strings", () => {
      const { parse } = compile("/profile/:id{3,4}");
      expect(parse("/profile/1/2")).toStrictEqual(null);
      expect(parse("/profile/1/2/3")).toStrictEqual({ path: "/profile/1/2/3", params: { id: ["1", "2", "3"] } });
      expect(parse("/profile/1/2/3/4")).toStrictEqual({ path: "/profile/1/2/3/4", params: { id: ["1", "2", "3", "4"] } });
      expect(parse("/profile/1/2/3/4/5")).toStrictEqual(null);
    });

    it("enforces bounds and coerces for <number>", () => {
      const { parse } = compile("/profile/:id<number>{3,4}");
      expect(parse("/profile/1/2")).toStrictEqual(null);
      expect(parse("/profile/1/2/3")).toStrictEqual({ path: "/profile/1/2/3", params: { id: [1, 2, 3] } });
      expect(parse("/profile/1/2/3/4")).toStrictEqual({ path: "/profile/1/2/3/4", params: { id: [1, 2, 3, 4] } });
      expect(parse("/profile/1/2/3/4/5")).toStrictEqual(null);
    });

    it("enforces bounds and membership for <union>", () => {
      const { parse } = compile("/profile/:id<hello|argon|router>{3,4}");
      expect(parse("/profile/test/hello/router")).toStrictEqual(null);
      expect(parse("/profile/hello/argon/router")).toStrictEqual({ path: "/profile/hello/argon/router", params: { id: ["hello", "argon", "router"] } });
      expect(parse("/profile/hello/hello/argon/router")).toStrictEqual({ path: "/profile/hello/hello/argon/router", params: { id: ["hello", "hello", "argon", "router"] } });
      expect(parse("/profile/hello/hello/argon/argon/router")).toStrictEqual(null);
    });

    it("enforces the bounds of a smaller range", () => {
      const { parse } = compile("/r/:seg{2,3}");
      expect(parse("/r/a")).toBeNull();
      expect(parse("/r/a/b")).toStrictEqual({ path: "/r/a/b", params: { seg: ["a", "b"] } });
      expect(parse("/r/a/b/c")).toStrictEqual({ path: "/r/a/b/c", params: { seg: ["a", "b", "c"] } });
      expect(parse("/r/a/b/c/d")).toBeNull();
    });

    it("treats the optional modifier on a range as inert, keeping the minimum", () => {
      const { parse } = compile("/profile/:id{3,4}?");
      expect(parse("/profile/1/2")).toStrictEqual(null);
      expect(parse("/profile/1/2/3")).toStrictEqual({ path: "/profile/1/2/3", params: { id: ["1", "2", "3"] } });
      expect(parse("/profile/1/2/3/4")).toStrictEqual({ path: "/profile/1/2/3/4", params: { id: ["1", "2", "3", "4"] } });
      expect(parse("/profile/1/2/3/4/5")).toStrictEqual(null);
    });
  });
});
