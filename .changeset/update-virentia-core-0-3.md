---
"@virentia/router": minor
"@virentia/router-react": minor
"@virentia/router-react-native": minor
---

Bump peer dependencies to `@virentia/core` `>=0.3.0` and `@virentia/react` `>=0.2.2`, and migrate to the new value-based store API.

`@virentia/core@0.3` changed object stores from the property-proxy form to the value form: store values are now read and written through `.value` (e.g. `store.value`, `store.value = next`), `reactive()` covers the old direct-property behaviour, and `Effect.$pending` was renamed to `Effect.pending`. The router internals were updated accordingly.
