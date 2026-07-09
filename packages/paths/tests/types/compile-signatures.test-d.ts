import { describe, expectTypeOf, it } from "vitest";
import { compile } from "../../lib";
import type { Builder, Parser } from "../../lib";

describe("compile", () => {
  describe("parse", () => {
    it("returns a Parser typed on the inferred params", () => {
      const { parse } = compile("/users/:id<number>");
      expectTypeOf(parse).toEqualTypeOf<Parser<{ id: number }>>();
      expectTypeOf(parse("/users/1")).toEqualTypeOf<
        { path: string; params: { id: number } } | null
      >();
    });

    it("does not widen the match to any", () => {
      const { parse } = compile("/users/:id");
      expectTypeOf(parse("/users/1")).not.toBeAny();
      // @ts-expect-error parse expects a string path
      parse(123);
    });
  });

  describe("build", () => {
    it("requires the params argument for a param route", () => {
      const { build } = compile("/users/:id");
      expectTypeOf(build).toEqualTypeOf<Builder<{ id: string }>>();
      // @ts-expect-error a param route requires its params argument
      build();
      // @ts-expect-error id must be a string, not a number
      build({ id: 1 });
      // @ts-expect-error an unknown param key is rejected
      build({ nope: "x" });
    });

    it("makes the params argument optional for a static route", () => {
      const { build } = compile("/static/only");
      expectTypeOf(build).toEqualTypeOf<Builder<void>>();
      expectTypeOf(build()).toEqualTypeOf<string>();
    });
  });
});
