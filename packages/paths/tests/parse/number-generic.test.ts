import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("parse", () => {
  describe("a <number> generic param", () => {
    it("coerces the captured segment to a number", () => {
      expect(compile("/profile/:id<number>").parse("/profile/12323")).toStrictEqual({
        path: "/profile/12323",
        params: { id: 12323 }
      });
    });

    it("accepts decimal integers, including leading zeros", () => {
      const { parse } = compile("/n/:id<number>");
      expect(parse("/n/0")).toStrictEqual({ path: "/n/0", params: { id: 0 } });
      expect(parse("/n/42")).toStrictEqual({ path: "/n/42", params: { id: 42 } });
      expect(parse("/n/007")).toStrictEqual({ path: "/n/007", params: { id: 7 } });
    });

    it("accepts negative and fixed-point numbers", () => {
      const { parse } = compile("/n/:id<number>");
      expect(parse("/n/-3")).toStrictEqual({ path: "/n/-3", params: { id: -3 } });
      expect(parse("/n/3.14")).toStrictEqual({ path: "/n/3.14", params: { id: 3.14 } });
    });

    it("rejects hex, exponent, Infinity, NaN, signed and empty forms", () => {
      const { parse } = compile("/n/:id<number>");
      expect(parse("/n/0x1f")).toBeNull();
      expect(parse("/n/1e3")).toBeNull();
      expect(parse("/n/Infinity")).toBeNull();
      expect(parse("/n/NaN")).toBeNull();
      expect(parse("/n/+5")).toBeNull();
      expect(parse("/n/ ")).toBeNull();
      expect(parse("/n/1.")).toBeNull();
      expect(parse("/n/.5")).toBeNull();
    });

    it("normalizes surrounding whitespace in the generic body", () => {
      expect(compile("/n/:id< number >").parse("/n/9")).toStrictEqual({
        path: "/n/9",
        params: { id: 9 }
      });
    });

    it("returns the number or undefined for an optional value", () => {
      const { parse } = compile("/profile/:id<number>?");
      expect(parse("/profile/1")).toStrictEqual({ path: "/profile/1", params: { id: 1 } });
      expect(parse("/profile")).toStrictEqual({ path: "/profile", params: { id: undefined } });
    });
  });
});
