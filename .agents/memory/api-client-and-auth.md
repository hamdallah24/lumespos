---
name: api-client imports & web auth for assets
description: Two gotchas — barrel-only exports for the generated API client, and Clerk cookie auth letting img tags reach protected routes
---

## Import generated types from the barrel, not deep paths
`@workspace/api-client-react` package.json `exports` only exposes `.` (the barrel `src/index.ts`). Deep imports like `@workspace/api-client-react/src/generated/api.schemas` fail typecheck under `moduleResolution: bundler` ("Cannot find module"). The barrel re-exports everything (hooks via `export *` from `generated/api`, types via `export *` from `generated/api.schemas`), so import both hooks and types from `@workspace/api-client-react`.
**Why:** exports map enforcement blocks unlisted subpaths.
**How to apply:** any pos-app/artifact file needing a schema type imports it from the barrel.

## Generated query hooks require queryKey if you pass query options
The Orval-generated hooks type options as full `UseQueryOptions` (TanStack v5), so passing just `{ query: { enabled } }` fails (queryKey required). Avoid `enabled`-gating; instead make the data available unconditionally. For branch-scoped queries, `BranchProvider` blocks rendering until a branch resolves and exposes `branchId: number` (never null) downstream, so queries always have a valid param and need no gating.

## Web app uses Clerk session cookies, so img tags can hit protected routes
The web client does NOT use `setAuthTokenGetter` (that's Expo-only); it relies on Clerk session cookies the browser sends automatically same-origin. `requireAuth` uses `getAuth(req)` which reads that cookie. Therefore an `<img src="/api/storage/objects/...">` to a `requireAuth`-protected route still authenticates.
**Why:** lets private object-storage assets (e.g. shift-audit proof photos) be protected without a per-object ACL or signed URLs.
**How to apply:** protecting an asset route with `requireAuth` is sufficient for same-origin `<img>`/browser GETs in this web app.
