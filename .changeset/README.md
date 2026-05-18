# Changesets

Public package behavior changes should include `pnpm changeset`.

The manual release workflow creates a release pull request while pending changesets exist. After that pull request is merged, running the workflow again publishes packages to npm.
