type CompatibilityMode = "express";

const cases = {
  express: [
    [/:id<.+>/g, ":id"],
    [/:id\+/g, "*id"],
    [/:id\*/g, "*id"],
    [/:id\{.+\}/g, "*id"],
    [/([a-zA-Z0-9:/_.]+)\/([*:])id\?/g, "$1{/$2id}"],
    [/([*:])id\?/g, "{$1id}"]
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
  }
}
