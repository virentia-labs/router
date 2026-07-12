import { NUMBER_RE } from "./prepare-parser";
import type { Builder, ParameterToken, Token } from "./types";

export function prepareBuilder<T>(tokens: Token[]): Builder<T> {
  return ((params: any = undefined) => {
    const result: string[] = [];

    if (tokens.length === 0) {
      return "/";
    }

    for (const token of tokens) {
      if (token.type === "const") {
        result.push(token.name);
        continue;
      }

      const { arrayProps, required } = token.payload;
      // Own-property read only: a param named after a prototype member
      // (`constructor`, `toString`, …) must NOT resolve to the inherited value.
      const value =
        params != null && Object.hasOwn(params, token.name) ? params[token.name] : undefined;

      const genericProps = token.payload.genericProps;

      if (arrayProps) {
        const items = Array.isArray(value) ? value : value == null ? [] : [value];
        const min = arrayProps.min ?? 0;

        // A required (`+` / `{min>=1}`) array that is empty/absent would emit a
        // URL the parser then rejects. Fail loudly instead.
        if (items.length < min) {
          throw new Error(`Parameter "${token.name}" requires at least ${min} value(s)`);
        }

        for (const item of items) {
          result.push(encodeValue(item, genericProps, token.name));
        }

        continue;
      }

      // A scalar with no meaningful value: null/undefined AND "" (an empty string
      // would produce an empty segment — a malformed URL its own parser rejects).
      if (value == null || value === "") {
        if (required) {
          throw new Error(`Missing required parameter "${token.name}"`);
        }

        continue;
      }

      result.push(encodeValue(value, genericProps, token.name));
    }

    return `/${result.join("/")}`;
  }) as Builder<T>;
}

// Validate a value against the param's generic constraint, then percent-encode it
// so a "/" (or any reserved character) inside a single param stays in one segment
// and round-trips through the parser (which decodes symmetrically). Validation
// mirrors the parser exactly, so build() never emits a URL parse would reject —
// e.g. a `<number>` value of NaN/Infinity or one String()-rendered in exponent
// notation (1e21, 1e-7), or a `<union>` value outside the allowed set.
function encodeValue(
  value: unknown,
  genericProps: ParameterToken["payload"]["genericProps"],
  name: string,
): string {
  const raw = String(value);

  if (genericProps?.type === "number" && !NUMBER_RE.test(raw)) {
    throw new Error(`Parameter "${name}" must be a decimal number, got "${raw}"`);
  }

  if (genericProps?.type === "union" && !genericProps.items.includes(raw)) {
    throw new Error(
      `Parameter "${name}" must be one of "${genericProps.items.join("|")}", got "${raw}"`,
    );
  }

  return encodeURIComponent(raw);
}
