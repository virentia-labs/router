import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Outlet } from "../../lib";

describe("Outlet", () => {
  it("renders nothing when no outlet context is provided", () => {
    const { container } = render(<Outlet />);

    expect(container.firstChild).toBeNull();
  });
});
