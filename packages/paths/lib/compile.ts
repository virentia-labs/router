import { getTokenParameters } from "./get-token-parameters";
import { prepareBuilder } from "./prepare-builder";
import { prepareParser } from "./prepare-parser";
import type { ParameterToken, ParseUrlParams, Token } from "./types";

export function compile<T extends string, Params = ParseUrlParams<T>>(path: T) {
  const tokens: Token[] = [];
  // Anchored to the whole segment: a "/"-split segment is a parameter only when
  // it IS `:name<generic>{range}modifier`, not when it merely CONTAINS one. This
  // prevents a literal segment like "a:b" or "localhost:3000" from being silently
  // reinterpreted as a parameter.
  const regexp = /^:(\w+)(<[\s?\w|]+>)?({\d+,\d+})?([+*?])?$/;
  const parsedTokens = path.split("/").filter(Boolean);

  for (const parsedToken of parsedTokens) {
    const parameters = getTokenParameters(parsedToken.match(regexp));

    if (!parameters) {
      tokens.push({ type: "const", name: parsedToken, payload: undefined });
      continue;
    }

    const { arrayProps, genericProps, modifier, name } = parameters;

    if (!name) {
      throw new Error(`Invalid path: "${path}". Name for argument must be provided`);
    }

    const token: ParameterToken = {
      type: "parameter",
      name,
      payload: {
        required: true
      }
    };

    if (genericProps === "number") {
      token.payload.genericProps = { type: "number" };
    }

    if (genericProps?.includes("|")) {
      token.payload.genericProps = {
        type: "union",
        items: genericProps.split("|")
      };
    }

    switch (modifier) {
      case "*": {
        token.payload.arrayProps = {};
        break;
      }
      case "+": {
        token.payload.arrayProps = { min: 1 };
        break;
      }
      case "?": {
        token.payload.required = false;
        break;
      }
    }

    if (arrayProps) {
      token.payload.arrayProps = {
        ...token.payload.arrayProps,
        min: arrayProps[0],
        max: arrayProps[1]
      };
    }

    tokens.push(token);
  }

  return {
    parse: prepareParser<Params>(tokens),
    build: prepareBuilder<Params>(tokens)
  };
}
