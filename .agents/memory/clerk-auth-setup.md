---
name: Clerk Auth Setup
description: Clerk is provisioned and wired. First registered user becomes owner automatically.
---

**Why:** First user should be the business owner; subsequent staff get cashier by default.

**How to apply:** JIT sync happens in UserSyncer component in App.tsx — calls POST /api/users/sync on every sign-in. The backend checks if users table is empty to assign owner role.

**Proxy middleware:** clerkProxyMiddleware.ts in artifacts/api-server/src/middlewares/ — mounts at CLERK_PROXY_PATH before cors/body parsing.

**Dev keys:** VITE_CLERK_PUBLISHABLE_KEY is a pk_test_ key in dev. This is expected and not an error.

**publishableKeyFromHost:** Must be imported from `@clerk/react/internal`, not `@clerk/react`. Always use this, never the raw env var.
