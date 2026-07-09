import { describe, expect, it } from "vitest";
import { compile } from "../../lib";

describe("round-trip", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["/p/:id", { id: "hello" }],
    ["/p/:id<number>", { id: 42 }],
    ["/p/:id", { id: "a/b/c" }],
    ["/p/:id", { id: "weird value & symbols" }],
    ["/a/:x/b/:y", { x: "1", y: "2" }],
    ["/list/:id+", { id: ["1", "2", "3"] }]
  ];

  it.each(cases)("parse(build(%s)) recovers the params", (template, params) => {
    const { build, parse } = compile(template);
    const url = build(params as never);
    const parsed = parse(url);
    expect(parsed).not.toBeNull();
    expect(parsed?.params).toStrictEqual(params);
  });
});
