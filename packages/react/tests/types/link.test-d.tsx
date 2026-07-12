import { describe, expectTypeOf, it } from "vitest";
import { route } from "@virentia/router";
import type { Query } from "@virentia/router";
import { Link, useLink } from "../../lib";
import type { LinkProps } from "../../lib";

// Type-level spec for <Link> and useLink. Validated by `vitest --typecheck`
// AND the repo-wide `tsc --noEmit` (this file lives under packages/**).
//
// LinkProps is a conditional on the route's Params:
//   Params extends Record<string, never> | void | undefined
//     ? BaseLinkProps & { params?: Params }   // params OPTIONAL
//     : BaseLinkProps & { params: Params };    // params REQUIRED

const homeRoute = route({ path: "/" }); // PathRoute<void>
const profileRoute = route({ path: "/profile/:id" }); // PathRoute<{ id: string }>

describe("LinkProps", () => {
  it("requires params with the exact shape for a param route", () => {
    expectTypeOf<LinkProps<{ id: string }>>().toHaveProperty("params");
    expectTypeOf<LinkProps<{ id: string }>["params"]>().toEqualTypeOf<{
      id: string;
    }>();
  });

  it("makes params optional for a void route", () => {
    // Indexing an optional property yields `T | undefined`; here `void | undefined`.
    expectTypeOf<LinkProps<void>["params"]>().toEqualTypeOf<void | undefined>();
  });

  it("makes params optional for an empty-object route", () => {
    expectTypeOf<
      LinkProps<Record<string, never>>["params"]
    >().toEqualTypeOf<Record<string, never> | undefined>();
  });
});

describe("Link", () => {
  it("accepts params on a param route", () => {
    const ok = <Link to={profileRoute} params={{ id: "1" }} />;
    expectTypeOf(ok).not.toBeAny();
  });

  it("rejects omitting params on a param route", () => {
    // @ts-expect-error `params` is required for a route with params.
    const bad = <Link to={profileRoute} />;
    expectTypeOf(bad).not.toBeAny();
  });

  it("rejects a mismatched params shape", () => {
    // @ts-expect-error `{ wrong }` is not assignable to `{ id: string }`.
    const bad = <Link to={profileRoute} params={{ wrong: "x" }} />;
    expectTypeOf(bad).not.toBeAny();
  });

  it("needs no params on a void route", () => {
    const ok = <Link to={homeRoute} />;
    expectTypeOf(ok).not.toBeAny();
  });

  it("allows explicitly undefined params on a void route", () => {
    const explicitUndefined = <Link to={homeRoute} params={undefined} />;
    expectTypeOf(explicitUndefined).not.toBeAny();
  });

  it("rejects real params on a void route", () => {
    // @ts-expect-error a void route has no params to pass.
    const bad = <Link to={homeRoute} params={{ id: "1" }} />;
    expectTypeOf(bad).not.toBeAny();
  });

  it("accepts shared anchor/open props alongside params", () => {
    const ok = (
      <Link
        to={profileRoute}
        params={{ id: "1" }}
        query={{ tab: "posts" }}
        replace
        className="link"
        target="_blank"
      />
    );
    expectTypeOf(ok).not.toBeAny();
    // The shared open/anchor props are actually typed on LinkProps, not `any`.
    expectTypeOf<LinkProps<{ id: string }>["query"]>().toEqualTypeOf<Query | undefined>();
    expectTypeOf<LinkProps<{ id: string }>["replace"]>().toEqualTypeOf<boolean | undefined>();
    expectTypeOf<LinkProps<{ id: string }>["to"]>().not.toBeAny();
  });
});

describe("useLink", () => {
  it("returns a path string with an open method for a param route", () => {
    const link = useLink(profileRoute, { id: "1" });
    expectTypeOf(link.path).toEqualTypeOf<string>();
    expectTypeOf(link).toHaveProperty("open");
  });

  it("rejects wrong params for a param route", () => {
    // @ts-expect-error params must match `{ id: string }`.
    useLink(profileRoute, { wrong: "x" });
  });

  it("needs no params argument for a void route", () => {
    const link = useLink(homeRoute);
    expectTypeOf(link.path).toEqualTypeOf<string>();
  });

  it("exposes params/query as optional positionals", () => {
    // A param route is callable with (route, params[, query]); a void route
    // with just (route) — the params/query positionals are optional. Each call
    // compiles only if the overload accepts those arguments.
    const withParams = useLink(profileRoute, { id: "1" });
    const withParamsAndQuery = useLink(profileRoute, { id: "1" }, { q: "x" });
    const voidRoute = useLink(homeRoute);
    expectTypeOf(withParams).toHaveProperty("path");
    expectTypeOf(withParamsAndQuery).toHaveProperty("path");
    expectTypeOf(voidRoute).toHaveProperty("path");
  });
});
