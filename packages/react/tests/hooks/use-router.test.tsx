import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useRouter } from "../../lib";

describe("useRouter", () => {
  it("throws when rendered outside a RouterProvider", () => {
    function Probe() {
      useRouter();
      return null;
    }

    expect(() => render(<Probe />)).toThrow(
      "[useRouter] Router is not provided. Wrap the tree with RouterProvider.",
    );
  });
});
