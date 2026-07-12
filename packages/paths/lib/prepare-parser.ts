import type { Parser, Token } from "./types";

export function prepareParser<T>(tokens: Token[]): Parser<T> {
  return (input) => {
    const rawTokens = input
      .split("/")
      .map((part) => part.trim())
      .filter((part) => part !== "");

    let params: Record<string, unknown> | null = null;

    function setKey(key: string, value: unknown) {
      params ??= {};
      params[key] = value;
    }

    if (tokens.length === 0) {
      return rawTokens.length === 0 ? { path: input, params: null as T } : null;
    }

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];

      if (!token) {
        return null;
      }

      if (token.type === "const") {
        if (token.name !== safeDecode(rawTokens.shift())) {
          return null;
        }

        continue;
      }

      const { arrayProps, genericProps, required } = token.payload;

      if (arrayProps) {
        const max = arrayProps.max ?? Infinity;
        // Leave enough trailing segments for the tokens that follow, so an
        // unbounded array (`*`/`+`) does not swallow segments a later const or
        // required param needs. Without this, `/:path*/end` never matches.
        const reserved = reservedTrailing(tokens, i);
        const array: unknown[] = [];

        while (array.length < max && rawTokens.length > reserved) {
          const parsed = parseToken(safeDecode(rawTokens.shift()), genericProps);

          if (!parsed.success) {
            return null;
          }

          array.push(parsed.value);
        }

        if (array.length < (arrayProps.min ?? 0)) {
          return null;
        }

        if (rawTokens.length > 0 && !tokens[i + 1]) {
          return null;
        }

        setKey(token.name, array);
        continue;
      }

      const rawToken = rawTokens.shift();

      if (required && !rawToken) {
        return null;
      }

      if (!rawToken) {
        setKey(token.name, undefined);
        continue;
      }

      const parsed = parseToken(safeDecode(rawToken), genericProps);

      if (!parsed.success) {
        return null;
      }

      setKey(token.name, parsed.value);
    }

    if (rawTokens.length > 0) {
      return null;
    }

    return { path: input, params: params as T };
  };
}

// Minimal number of segments the tokens AFTER `from` must consume, so an array at
// `from` never claims more than it is allowed to leave behind.
function reservedTrailing(tokens: Token[], from: number): number {
  let reserved = 0;

  for (let k = from + 1; k < tokens.length; k += 1) {
    const token = tokens[k];

    if (!token) {
      continue;
    }

    if (token.type === "const") {
      reserved += 1;
      continue;
    }

    if (token.payload.arrayProps) {
      reserved += token.payload.arrayProps.min ?? 0;
      continue;
    }

    if (token.payload.required) {
      reserved += 1;
    }
  }

  return reserved;
}

// Match a decimal integer or fixed-point number only. A route matcher must not
// silently accept JS numeric-literal exotica (hex 0x1f, exponent 1e3, Infinity,
// signed "+5") as a <number> param. Exported so the builder validates against the
// exact same grammar it parses with — build() must never emit what parse rejects.
export const NUMBER_RE = /^-?\d+(\.\d+)?$/;

function parseToken(
  rawToken: string | undefined,
  genericProps: { type: "union"; items: string[] } | { type: "number" } | undefined,
): { success: true; value: unknown } | { success: false } {
  if (rawToken === undefined) {
    return { success: false };
  }

  if (genericProps?.type === "number") {
    if (!NUMBER_RE.test(rawToken)) {
      return { success: false };
    }

    return { success: true, value: Number(rawToken) };
  }

  if (genericProps?.type === "union") {
    if (!genericProps.items.includes(rawToken)) {
      return { success: false };
    }

    return { success: true, value: rawToken };
  }

  return { success: true, value: rawToken };
}

// URL path segments are percent-encoded; decode symmetrically with the builder.
// Malformed encodings fall back to the raw text rather than throwing.
function safeDecode(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
