import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("a '+' array param", () => {
    it("requires at least one segment", () => {
      const { parse } = compile("/profile/:id+");
      expect(parse("/profile/1")).toStrictEqual({ path: "/profile/1", params: { id: ["1"] } });
      expect(parse("/profile/1/2")).toStrictEqual({ path: "/profile/1/2", params: { id: ["1", "2"] } });
      expect(parse("/profile")).toStrictEqual(null);
    });

    it("coerces each element of a <number> array", () => {
      const { parse } = compile("/profile/:id<number>+");
      expect(parse("/profile/1")).toStrictEqual({ path: "/profile/1", params: { id: [1] } });
      expect(parse("/profile/1/2")).toStrictEqual({ path: "/profile/1/2", params: { id: [1, 2] } });
      expect(parse("/profile")).toStrictEqual(null);
    });

    it("rejects the match when one <number> element is not a number", () => {
      expect(compile("/r/:seg<number>+").parse("/r/1/2/3")).toStrictEqual({
        path: "/r/1/2/3",
        params: { seg: [1, 2, 3] }
      });
      expect(compile("/r/:seg<number>+").parse("/r/1/x")).toBeNull();
    });

    it("keeps <union> members across the array", () => {
      const { parse } = compile("/profile/:id<hello|world>+");
      expect(parse("/profile/hello/world")).toStrictEqual({ path: "/profile/hello/world", params: { id: ["hello", "world"] } });
      expect(parse("/profile/world/hello")).toStrictEqual({ path: "/profile/world/hello", params: { id: ["world", "hello"] } });
      expect(parse("/profile/world")).toStrictEqual({ path: "/profile/world", params: { id: ["world"] } });
      expect(parse("/profile/test")).toStrictEqual(null);
    });
  });

  describe("a '*' array param", () => {
    it("allows an empty string array", () => {
      const { parse } = compile("/profile/:id*");
      expect(parse("/profile/1")).toStrictEqual({ path: "/profile/1", params: { id: ["1"] } });
      expect(parse("/profile/1/2")).toStrictEqual({ path: "/profile/1/2", params: { id: ["1", "2"] } });
      expect(parse("/profile")).toStrictEqual({ path: "/profile", params: { id: [] } });
    });

    it("allows an empty <number> array", () => {
      const { parse } = compile("/profile/:id<number>*");
      expect(parse("/profile/1")).toStrictEqual({ path: "/profile/1", params: { id: [1] } });
      expect(parse("/profile/1/2")).toStrictEqual({ path: "/profile/1/2", params: { id: [1, 2] } });
      expect(parse("/profile")).toStrictEqual({ path: "/profile", params: { id: [] } });
    });

    it("allows an empty <union> array", () => {
      const { parse } = compile("/profile/:id<hello|world>*");
      expect(parse("/profile/hello/world")).toStrictEqual({ path: "/profile/hello/world", params: { id: ["hello", "world"] } });
      expect(parse("/profile/world/hello")).toStrictEqual({ path: "/profile/world/hello", params: { id: ["world", "hello"] } });
      expect(parse("/profile/world")).toStrictEqual({ path: "/profile/world", params: { id: ["world"] } });
      expect(parse("/profile")).toStrictEqual({ path: "/profile", params: { id: [] } });
      expect(parse("/profile/test")).toStrictEqual(null);
    });
  });
});
