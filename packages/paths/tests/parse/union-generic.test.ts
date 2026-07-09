import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("a <union> generic param", () => {
    it("captures a member and rejects a non-member", () => {
      const { parse } = compile("/profile/:id<hello|world>");
      expect(parse("/profile/hello")).toStrictEqual({ path: "/profile/hello", params: { id: "hello" } });
      expect(parse("/profile/world")).toStrictEqual({ path: "/profile/world", params: { id: "world" } });
      expect(parse("/profile/test")).toStrictEqual(null);
    });

    it("normalizes whitespace around members and pipes", () => {
      const { parse } = compile("/profile/:id<hello | world >");
      expect(parse("/profile/hello")).toStrictEqual({ path: "/profile/hello", params: { id: "hello" } });
      expect(parse("/profile/world")).toStrictEqual({ path: "/profile/world", params: { id: "world" } });
      expect(parse("/profile/test")).toStrictEqual(null);
    });

    it("keeps a numeric-looking member as a string", () => {
      expect(compile("/u/:x<1|2>").parse("/u/1")).toStrictEqual({ path: "/u/1", params: { x: "1" } });
    });

    it("returns the member or undefined for an optional value", () => {
      const { parse } = compile("/profile/:id<hello|world>?");
      expect(parse("/profile/hello")).toStrictEqual({ path: "/profile/hello", params: { id: "hello" } });
      expect(parse("/profile/world")).toStrictEqual({ path: "/profile/world", params: { id: "world" } });
      expect(parse("/profile")).toStrictEqual({ path: "/profile", params: { id: undefined } });
    });
  });
});
