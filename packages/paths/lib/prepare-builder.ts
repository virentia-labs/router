import type { Builder, Token } from "./types";

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

      const value = params?.[token.name];

      if (value == null) {
        continue;
      }

      if (Array.isArray(value)) {
        for (const item of value) {
          result.push(String(item));
        }
      } else {
        result.push(String(value));
      }
    }

    return `/${result.join("/")}`;
  }) as Builder<T>;
}
