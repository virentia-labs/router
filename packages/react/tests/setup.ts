import { cleanup } from "@testing-library/react";
import { afterEach, beforeAll } from "vitest";

// Tests that assert a <Link> click is IGNORED (modified click / non-_self target)
// deliberately let the anchor's default navigation proceed; happy-dom then tries
// to load the target URL, producing a noisy ECONNREFUSED. Cancel the default
// navigation in the BUBBLE phase — after React's onClick (and Link's own
// `defaultPrevented` check) have already run — so behavior is unchanged but no
// real navigation is attempted.
beforeAll(() => {
  document.addEventListener("click", (event) => {
    const anchor = (event.target as HTMLElement | null)?.closest("a");

    if (anchor) {
      event.preventDefault();
    }
  });
});

afterEach(() => {
  cleanup();
});
