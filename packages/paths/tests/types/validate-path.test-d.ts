import { describe, expectTypeOf, it } from "vitest";
import type { ValidatePath } from "../../lib";

describe("ValidatePath", () => {
  describe("a valid path", () => {
    it("resolves to the path literal itself", () => {
      expectTypeOf<ValidatePath<"/users/:id">>().toEqualTypeOf<"/users/:id">();
      expectTypeOf<ValidatePath<"/users/:id<number>">>().toEqualTypeOf<"/users/:id<number>">();
      expectTypeOf<ValidatePath<"/t/:tab<a|b>">>().toEqualTypeOf<"/t/:tab<a|b>">();
      expectTypeOf<ValidatePath<"/u/:id{3,4}">>().toEqualTypeOf<"/u/:id{3,4}">();
    });
  });

  describe("an invalid generic", () => {
    it("surfaces the corrected template", () => {
      expectTypeOf<ValidatePath<"/u/:id<garbage>">>().toEqualTypeOf<["invalid", "/u/:id<number,union>"]>();
      expectTypeOf<ValidatePath<"/u/:id<string>">>().toEqualTypeOf<["invalid", "/u/:id<number,union>"]>();
    });
  });

  describe("a malformed range", () => {
    it("surfaces the corrected template", () => {
      expectTypeOf<ValidatePath<"/u/:id{a,b}">>().toEqualTypeOf<["invalid", "/u/:id{number,number}"]>();
    });
  });
});
