import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("build", () => {
  describe("a <number> value guard", () => {
    it("throws when the value is not a plain decimal", () => {
      const { build } = compile("/n/:id<number>");
      for (const bad of [NaN, Infinity, -Infinity, 1e21, 0.0000001]) {
        expect(() => build({ id: bad } as never)).toThrow(/must be a decimal number/);
      }
    });

    it("builds and round-trips a valid decimal", () => {
      const { build: b, parse } = compile("/n/:id<number>");
      expect(parse(b({ id: 42 } as never))).toStrictEqual({ path: "/n/42", params: { id: 42 } });
    });

    it("throws when an array element is not a plain decimal", () => {
      expect(() => compile("/r/:seg<number>+").build({ seg: [1, NaN] } as never)).toThrow(
        /must be a decimal number/
      );
    });
  });

  describe("a <union> value guard", () => {
    it("throws when the value is outside the set", () => {
      expect(() => compile("/t/:tab<a|b>").build({ tab: "zzz" } as never)).toThrow(/must be one of/);
    });

    it("builds a valid member", () => {
      expect(compile("/t/:tab<a|b>").build({ tab: "a" } as never)).toBe("/t/a");
    });
  });
});
