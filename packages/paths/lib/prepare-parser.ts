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
        if (token.name !== rawTokens.shift()) {
          return null;
        }

        continue;
      }

      const { arrayProps, genericProps, required } = token.payload;

      if (arrayProps) {
        const array: unknown[] = [];
        let rawToken: string | undefined;

        while (true) {
          rawToken = rawTokens.shift();

          if (!rawToken) {
            break;
          }

          const parsed = parseToken(rawToken, genericProps);

          if (!parsed.success) {
            return null;
          }

          array.push(parsed.value);

          if (array.length >= (arrayProps.max ?? Infinity)) {
            break;
          }
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

      const parsed = parseToken(rawToken, genericProps);

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

function parseToken(
  rawToken: string,
  genericProps: { type: "union"; items: string[] } | { type: "number" } | undefined,
): { success: true; value: unknown } | { success: false } {
  if (genericProps?.type === "number") {
    if (Number.isNaN(Number(rawToken))) {
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
