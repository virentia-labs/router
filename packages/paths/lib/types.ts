/* eslint-disable @typescript-eslint/no-unused-vars */

export type ReplaceAll<
  S,
  From extends string,
  To extends string,
> = From extends ""
  ? S
  : S extends `${infer R1}${From}${infer R2}`
    ? `${R1}${To}${ReplaceAll<R2, From, To>}`
    : S;

type Parameter<Name extends string, Payload> = {
  [Key in Name]: Payload;
};

type WithModifier<Type, T extends string> =
  T extends `${infer _K}{${infer _Start},${infer _End}}+`
    ? Type[]
    : T extends `${infer _K}{${infer _Start},${infer _End}}*`
      ? Type[]
      : T extends `${infer _K}{${infer _Start},${infer _End}}?`
        ? Type[] | undefined
        : T extends `${infer _K}{${infer _Start},${infer _End}}`
          ? Type[]
          : T extends `${infer _K}+`
            ? Type[]
            : T extends `${infer _K}*`
              ? Type[]
              : T extends `${infer _K}?`
                ? Type | undefined
                : Type;

type WithoutModifier<T extends string> =
  T extends `${infer K}{${infer _Start},${infer _End}}${infer _Modifier}`
    ? K
    : T extends `${infer K}{${infer _Start},${infer _End}}`
      ? K
      : T extends `${infer K}?`
        ? K
        : T extends `${infer K}*`
          ? K
          : T extends `${infer K}+`
            ? K
            : T;

type Union<T extends string, Result = void> =
  T extends `${infer Start}|${infer Tail}`
    ? Union<Tail, Result extends void ? Start : Result | Start>
    : Result extends void
      ? T
      : Result | T;

type GenericType<T extends string> =
  ReplaceAll<T, " ", ""> extends infer Trimmed
    ? Trimmed extends "number"
      ? number
      : Trimmed extends `${infer _A}|${infer _B}`
        ? Union<Trimmed & string>
        : Trimmed
    : never;

export type UrlParameter<T extends string> =
  T extends `:${infer Name}<${infer Type}>${infer Modifier}`
    ? Parameter<WithoutModifier<Name>, WithModifier<GenericType<Type>, T>>
    : T extends `:${infer Name}<${infer Type}>`
      ? Parameter<Name, GenericType<Type>>
      : T extends `:${infer Name}`
        ? Parameter<WithoutModifier<Name>, WithModifier<string, T>>
        : never;

type UrlParams<T extends string, Result = void> =
  T extends `/:${infer Parameter}/${infer Route}`
    ? Result extends void
      ? UrlParams<`/${Route}`, UrlParameter<`:${Parameter}`>>
      : UrlParams<`/${Route}`, Result & UrlParameter<`:${Parameter}`>>
    : T extends `/:${infer Parameter}`
      ? Result extends void
        ? UrlParameter<`:${Parameter}`>
        : Result & UrlParameter<`:${Parameter}`>
      : T extends `/${infer _Static}/${infer Next}`
        ? UrlParams<`/${Next}`, Result>
        : Result;

type Unwrap<Result extends UrlParams<any, void>> = {
  [Key in keyof Result]: Result[Key];
};

export type ParseUrlParams<T extends string> = Unwrap<UrlParams<T>>;

export type Builder<T> = [T] extends [void] ? (params?: T) => string : (params: T) => string;
export type Parser<T> = (path: string) => { path: string; params: T } | null;

interface BaseToken<Type, T = void> {
  type: Type;
  name: string;
  payload: T;
}

export type ConstToken = BaseToken<"const">;
export type ParameterToken = BaseToken<
  "parameter",
  {
    required: boolean;
    genericProps?: { type: "union"; items: string[] } | { type: "number" };
    arrayProps?: { min?: number; max?: number };
  }
>;

export type Token = ConstToken | ParameterToken;
