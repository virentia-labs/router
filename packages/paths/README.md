# @virentia/router-paths

Typed path compiler for Virentia Router.

It turns route templates into parser and builder functions. The router uses this package internally, and it can also be used by adapters, tests, and tools that need the same path semantics without creating routes.

## Links

- Documentation: [movpushmov.dev/virentia/router/paths](https://movpushmov.dev/virentia/router/paths)

## Install

```sh
pnpm add @virentia/router-paths
```

## Compile

```ts
import { compile } from "@virentia/router-paths";

const profilePath = compile("/profile/:id<number>");

profilePath.parse("/profile/42");
// { path: "/profile/42", params: { id: 42 } }

profilePath.build({ id: 42 });
// "/profile/42"
```

Templates support plain string params, `number` params, literal unions, optional params, repeated params, and ranged params.

```ts
const filesPath = compile("/files/:path<string|image>{1,3}");

filesPath.parse("/files/string/image");
// { path: "/files/string/image", params: { path: ["string", "image"] } }
```

## Express conversion

`convertPath` converts Virentia templates into an express-compatible shape for integrations that need route matching outside the Virentia router.

```ts
import { convertPath } from "@virentia/router-paths";

convertPath("/files/:id<number>?", "express");
// "/files{/:id}"
```

## Main API

`compile`, `convertPath`, `Builder`, `Parser`, `ParseUrlParams`, `ValidatePath`.

## License

MIT © 2026 movpushmov
