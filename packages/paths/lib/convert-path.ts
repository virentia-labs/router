type CompatibilityMode = "express";

// Each pass is local to a single parameter: the name is captured (\w+) rather than
// hardcoded to "id", and the generic/range bodies use non-greedy character classes
// ([^>]/[^}]) so a pass never spans across an intervening segment or a second
// parameter.
const cases = {
  express: [
    [/:(\w+)<[^>]+>/g, ":$1"],
    [/:(\w+)\+/g, "*$1"],
    [/:(\w+)\*/g, "*$1"],
    [/:(\w+)\{[^}]+\}/g, "*$1"],
    [/([a-zA-Z0-9:/_.\-~%]+)\/([*:])(\w+)\?/g, "$1{/$2$3}"],
    [/([*:])(\w+)\?/g, "{$1$2}"]
  ]
} as const;

export function convertPath(path: string, mode: CompatibilityMode): string {
  switch (mode) {
    case "express": {
      let nextPath = path;

      for (const [regex, replacement] of cases.express) {
        if (nextPath.match(regex)) {
          nextPath = nextPath.replace(regex, replacement);
        }
      }

      return nextPath;
    }

    default:
      return path;
  }
}
