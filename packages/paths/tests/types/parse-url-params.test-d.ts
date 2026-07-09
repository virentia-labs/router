import { describe, expectTypeOf, it } from "vitest";
import type { ParseUrlParams } from "../../lib";

// Type-level spec for @virentia/router-paths. Validated by the repo-wide
// `tsc --noEmit` (this file lives under packages/**) and by `vitest --typecheck`.

describe("ParseUrlParams", () => {
  describe("a scalar param", () => {
    it("infers a string param", () => {
      expectTypeOf<ParseUrlParams<"/users/:id">>().toEqualTypeOf<{ id: string }>();
    });

    it("infers a <number> param", () => {
      expectTypeOf<ParseUrlParams<"/users/:id<number>">>().toEqualTypeOf<{ id: number }>();
    });

    it("narrows a <union> to a literal union", () => {
      expectTypeOf<ParseUrlParams<"/t/:tab<a|b|c>">>().toEqualTypeOf<{ tab: "a" | "b" | "c" }>();
    });

    it("infers several params of mixed kinds", () => {
      expectTypeOf<ParseUrlParams<"/a/:x/b/:y">>().toEqualTypeOf<{ x: string; y: string }>();
    });
  });

  describe("an optional param", () => {
    it("adds | undefined to a string", () => {
      expectTypeOf<ParseUrlParams<"/u/:id?">>().toEqualTypeOf<{ id: string | undefined }>();
    });

    it("adds | undefined to a <number>", () => {
      expectTypeOf<ParseUrlParams<"/u/:id<number>?">>().toEqualTypeOf<{ id: number | undefined }>();
    });
  });

  describe("an array param", () => {
    it("infers string[] for '+'", () => {
      expectTypeOf<ParseUrlParams<"/u/:id+">>().toEqualTypeOf<{ id: string[] }>();
    });

    it("infers string[] for '*'", () => {
      expectTypeOf<ParseUrlParams<"/u/:id*">>().toEqualTypeOf<{ id: string[] }>();
    });

    it("infers number[] for a <number> repeat", () => {
      expectTypeOf<ParseUrlParams<"/u/:id<number>+">>().toEqualTypeOf<{ id: number[] }>();
    });

    it("infers string[] for a range", () => {
      expectTypeOf<ParseUrlParams<"/u/:id{2,3}">>().toEqualTypeOf<{ id: string[] }>();
    });
  });

  describe("a path with no params", () => {
    it("infers void so open() needs no args", () => {
      expectTypeOf<ParseUrlParams<"/static/only">>().toEqualTypeOf<void>();
      expectTypeOf<ParseUrlParams<"/">>().toEqualTypeOf<void>();
      expectTypeOf<ParseUrlParams<"/a/b/c">>().toEqualTypeOf<void>();
    });
  });
});
