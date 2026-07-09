import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

// Property: for structurally-valid params, parse(build(params)) recovers the
// exact params. build() percent-encodes each segment and parse() decodes
// symmetrically, so no reserved character can break the round-trip. fast-check
// prints the seed and the shrunk counterexample on failure.
describe("round-trip", () => {
  const scalar = fc.string({ minLength: 1 });

  it("recovers a string scalar for any non-empty value", () => {
    const { build, parse } = compile("/p/:id");
    fc.assert(
      fc.property(scalar, (id) => {
        const url = build({ id });
        expect(parse(url)).toStrictEqual({ path: url, params: { id } });
      })
    );
  });

  it("recovers a <number> scalar for any integer", () => {
    const { build, parse } = compile("/p/:id<number>");
    fc.assert(
      fc.property(fc.integer(), (id) => {
        const url = build({ id });
        expect(parse(url)).toStrictEqual({ path: url, params: { id } });
      })
    );
  });

  it("recovers a <union> member", () => {
    const { build, parse } = compile("/t/:tab<alpha|beta|gamma>");
    fc.assert(
      fc.property(fc.constantFrom("alpha", "beta", "gamma"), (tab) => {
        const url = build({ tab });
        expect(parse(url)).toStrictEqual({ path: url, params: { tab } });
      })
    );
  });

  it("recovers an optional scalar, present or omitted", () => {
    const { build, parse } = compile("/p/:id?");
    fc.assert(
      fc.property(fc.option(scalar, { nil: undefined }), (id) => {
        const url = build({ id });
        expect(parse(url)).toStrictEqual({ path: url, params: { id } });
      })
    );
  });

  it("recovers a '+' array for any non-empty list", () => {
    const { build, parse } = compile("/list/:id+");
    fc.assert(
      fc.property(fc.array(scalar, { minLength: 1 }), (id) => {
        const url = build({ id });
        expect(parse(url)).toStrictEqual({ path: url, params: { id } });
      })
    );
  });

  it("recovers a range array within its bounds", () => {
    const { build, parse } = compile("/r/:id{2,3}");
    fc.assert(
      fc.property(fc.array(scalar, { minLength: 2, maxLength: 3 }), (id) => {
        const url = build({ id });
        expect(parse(url)).toStrictEqual({ path: url, params: { id } });
      })
    );
  });
});
