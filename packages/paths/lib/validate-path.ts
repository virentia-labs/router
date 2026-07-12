import type { ReplaceAll } from "./types";

type SplitPath<S> = string extends S
  ? string[]
  : S extends `${infer Head}/${infer Tail}`
    ? Head extends ""
      ? SplitPath<Tail>
      : Tail extends ""
        ? [Head]
        : [Head, ...SplitPath<Tail>]
    : [S];

type JoinPath<T extends any[]> = `/${Join<T>}`;

type Join<T extends any[]> = T["length"] extends 0
  ? never
  : T extends [infer F, ...infer Rest]
    ? Join<Rest> extends infer Tail
      ? [Tail] extends [never]
        ? `${F & string}`
        : `${F & string}/${Tail & string}`
      : never
    : never;

type ValidateRange<Range> = Range extends `${infer L},${infer R}`
  ? L extends `${number}`
    ? R extends `${number}`
      ? ["valid", `{${Range}`]
      : ["invalid", `{${L},number}`]
    : R extends `${number}`
      ? ["invalid", `{number,${R}}`]
      : ["invalid", `{number,number}`]
  : ["invalid", `{number,number}`];

type ValidateTypes<GenTypes> = GenTypes extends "number"
  ? "valid"
  : GenTypes extends ""
    ? ["invalid", "<number,union>"]
    : GenTypes extends `${string}|${string}`
      ? "valid"
      : ["invalid", "<number,union>"];

type ValidateTokenBase<
  Token extends string,
  PostFix extends string = "",
> = Token extends `${infer Param}<${infer Types}>{${infer Range}}`
  ? ValidateTypes<Types> extends ["invalid", infer TypesReplacer]
    ? ["invalid", `:${Param}${TypesReplacer & string}{${Range}}${PostFix}`]
    : ValidateRange<Range> extends ["invalid", infer RangeReplacer]
      ? ["invalid", `:${Param}<${Types}>${RangeReplacer & string}${PostFix}`]
      : "valid"
  : Token extends `${infer Param}<${infer Types}>`
    ? ValidateTypes<Types> extends ["invalid", infer TypesReplacer]
      ? ["invalid", `:${Param}${TypesReplacer & string}${PostFix}`]
      : "valid"
    : Token extends `${infer Param}{${infer Range}}`
      ? ValidateRange<Range> extends ["invalid", infer RangeReplacer]
        ? ["invalid", `:${Param}${RangeReplacer & string}${PostFix}`]
        : "valid"
      : "valid";

type ValidateToken<Token> = Token extends `:${infer RawParam}`
  ? RawParam extends `${infer WithoutModifier}${"*" | "?" | "+"}`
    ? RawParam extends `${WithoutModifier}${infer Modifier}`
      ? ValidateTokenBase<WithoutModifier, Modifier>
      : never
    : ValidateTokenBase<RawParam>
  : "valid";

type ValidateTokens<
  Path,
  Current,
  Res extends string[] = [],
> = Current extends [infer Token, ...infer Rest]
  ? ValidateToken<ReplaceAll<Token, " ", "">> extends ["invalid", infer TokenReplacer]
    ? ["invalid", JoinPath<[...Res, TokenReplacer, ...Rest]>]
    : ValidateTokens<Path, Rest, [...Res, Token & string]>
  : Path;

export type ValidatePath<Path> = ValidateTokens<Path, SplitPath<Path>>;
