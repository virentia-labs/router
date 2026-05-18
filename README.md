# Virentia Router

Virentia-native router packages built directly on `@virentia/core` and
`@virentia/react`.

The package family provides typed path templates, route objects, programmatic
navigation, history adapters, query tracking, chained routes, React route views,
lazy views, and outlets. It does not expose Effector-style `$` aliases.

## Packages

- `@virentia/router-paths` compiles typed path templates.
- `@virentia/router` provides routes, routers, controls, adapters, grouped and
  chained routes, virtual routes, and query trackers.
- `@virentia/router-react` provides React bindings.

React Native bindings should live in `@virentia/router-react-native` once that
package is implemented and tested.

## Docs

Router documentation is maintained in the documentation repository:

- source: `/Users/edward/virentia/documentation/docs/router`
- site: `https://movpushmov.dev/virentia/router/`

## Development

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Generated `dist` folders are ignored by git.
