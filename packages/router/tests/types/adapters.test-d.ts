import type { EventCallable } from "@virentia/core";
import { describe, expectTypeOf, it } from "vitest";
import { historyAdapter, queryAdapter } from "../../lib";
import type {
  HistoryLike,
  NavigatePayload,
  RouterAdapter,
  RouterLocation,
  RouterSubscription,
  To
} from "../../lib";

const fakeHistory: HistoryLike = {
  location: { pathname: "/", search: "", hash: "" },
  push() {},
  replace() {},
  back() {},
  forward() {},
  listen: () => () => {}
};

describe("historyAdapter", () => {
  it("returns a RouterAdapter", () => {
    const adapter = historyAdapter(fakeHistory);

    expectTypeOf(adapter).toEqualTypeOf<RouterAdapter>();
    expectTypeOf(adapter).not.toBeAny();
    expectTypeOf(adapter.location).toEqualTypeOf<RouterLocation>();
    expectTypeOf(adapter.listen).toEqualTypeOf<
      (callback: (location: RouterLocation) => void) => RouterSubscription
    >();
  });

  describe("with a non-history argument", () => {
    it("rejects the call", () => {
      // @ts-expect-error a string is not a HistoryLike
      historyAdapter("nope");
    });
  });
});

describe("queryAdapter", () => {
  it("returns a RouterAdapter", () => {
    const adapter = queryAdapter(fakeHistory);

    expectTypeOf(adapter).toEqualTypeOf<RouterAdapter>();
    expectTypeOf(adapter).not.toBeAny();
  });
});

describe("RouterAdapter surface", () => {
  it("takes a To for push and replace", () => {
    const adapter = historyAdapter(fakeHistory);

    expectTypeOf(adapter.push).toEqualTypeOf<(to: To) => void>();
    expectTypeOf(adapter.replace).toEqualTypeOf<(to: To) => void>();
    expectTypeOf(adapter.goBack).toEqualTypeOf<() => void>();
    expectTypeOf(adapter.goForward).toEqualTypeOf<() => void>();

    adapter.push("/x");
    adapter.push({ pathname: "/x", search: "?a=1" });
    // @ts-expect-error a number is not a To
    adapter.push(1);
  });
});

describe("To", () => {
  it("is a string or a partial RouterLocation", () => {
    expectTypeOf<To>().toEqualTypeOf<string | Partial<RouterLocation>>();
  });
});

describe("RouterSubscription", () => {
  it("exposes an unsubscribe method", () => {
    expectTypeOf<RouterSubscription["unsubscribe"]>().toEqualTypeOf<() => void>();
  });
});

// Guard that NavigatePayload stays reachable from the adapters barrel export.
describe("NavigatePayload re-export", () => {
  it("is not any", () => {
    expectTypeOf<NavigatePayload>().not.toBeAny();
    expectTypeOf<EventCallable<NavigatePayload>>().not.toBeAny();
  });
});
