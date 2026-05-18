interface TokenParameters {
  name: string | undefined;
  genericProps: string | undefined;
  arrayProps: [number, number] | undefined;
  modifier: string | undefined;
}

export function getTokenParameters(match: RegExpMatchArray | null): TokenParameters | null {
  if (!match) {
    return null;
  }

  const [, name, rawGenericProps, rawArrayProps, modifier] = match;
  const genericProps = rawGenericProps?.slice(1, -1).replaceAll(" ", "");
  const arrayProps = rawArrayProps
    ?.slice(1, -1)
    .split(",")
    .map((value) => Number(value)) as [number, number] | undefined;

  return {
    name,
    genericProps,
    arrayProps,
    modifier
  };
}
