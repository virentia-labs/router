import { describe, expectTypeOf, it } from "vitest";
import { Outlet } from "../../lib";

// Type-level spec for <Outlet>. It is a zero-prop component.
describe("Outlet", () => {
  it("is a component callable with no props", () => {
    expectTypeOf(Outlet).toBeFunction();
    expectTypeOf(Outlet).parameters.toEqualTypeOf<[]>();
    expectTypeOf(Outlet).returns.not.toBeAny();
  });

  it("is not typed as any", () => {
    expectTypeOf(Outlet).not.toBeAny();
  });

  it("rejects being given props", () => {
    // @ts-expect-error Outlet takes no props.
    const bad = <Outlet foo="bar" />;
    expectTypeOf(bad).not.toBeAny();
  });
});
