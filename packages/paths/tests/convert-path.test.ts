import { describe, expect, test } from "vitest";
import { convertPath } from "../lib";

describe("convertPath", () => {
  test("converts express-compatible paths", () => {
    expect(convertPath("/", "express")).toBe("/");
    expect(convertPath("/:id", "express")).toBe("/:id");
    expect(convertPath("/:id+", "express")).toBe("/*id");
    expect(convertPath("/:id*", "express")).toBe("/*id");
    expect(convertPath("/:id?", "express")).toBe("/{:id}");
    expect(convertPath("/files/:id?", "express")).toBe("/files{/:id}");
    expect(convertPath("/files/:id<number>", "express")).toBe("/files/:id");
    expect(convertPath("/files/:id<number>?", "express")).toBe("/files{/:id}");
    expect(convertPath("/files/:id{1,2}", "express")).toBe("/files/*id");
    expect(convertPath("/files/:id{1,2}?", "express")).toBe("/files{/*id}");
  });
});
