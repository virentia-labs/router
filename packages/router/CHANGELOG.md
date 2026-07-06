# @virentia/router

## 0.2.1

### Patch Changes

- chore: bump virentia
- Updated dependencies
  - @virentia/router-paths@0.1.2

## 0.2.0

### Minor Changes

- 461101d: Bump peer dependencies to `@virentia/core` `>=0.3.0` and `@virentia/react` `>=0.2.2`, and migrate to the new value-based store API.

  `@virentia/core@0.3` changed object stores from the property-proxy form to the value form: store values are now read and written through `.value` (e.g. `store.value`, `store.value = next`), `reactive()` covers the old direct-property behaviour, and `Effect.$pending` was renamed to `Effect.pending`. The router internals were updated accordingly.

## 0.1.1

### Patch Changes

- fix: bump virentia version
- Updated dependencies
  - @virentia/router-paths@0.1.1

## 0.1.0

### Minor Changes

- e413838: Initial release of Virentia Router packages.

### Patch Changes

- Updated dependencies [e413838]
  - @virentia/router-paths@0.1.0
