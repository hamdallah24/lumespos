# Software Architect Agent — POS App Lume's Everywhere

## Project Structure
```
Point-Of-Sale/
├── artifacts/
│   ├── api-server/          # Express.js API (port 3000)
│   │   ├── src/
│   │   │   ├── app.ts           # CSP, CORS, CSRF, helmet, rate-limit, session
│   │   │   ├── index.ts         # Server entry
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts      # Login, signup, Google OAuth, reset password
│   │   │   │   ├── products.ts  # Product CRUD + variants
│   │   │   │   ├── orders.ts    # Order creation + history
│   │   │   │   ├── shiftAudits.ts # Shift start/end + sales
│   │   │   │   ├── expenses.ts  # Pengeluaran CRUD
│   │   │   │   ├── inventory.ts  # Stock management
│   │   │   │   ├── semiFinished.ts # Semi-finished goods
│   │   │   │   ├── dashboard.ts # Dashboard data
│   │   │   │   ├── users.ts     # User management
│   │   │   │   ├── storage.ts   # File upload
│   │   │   │   └── index.ts     # Route aggregator
│   │   │   ├── middlewares/
│   │   │   │   └── requireAuth.ts # Auth, GoogleStrategy, branchAccess
│   │   │   └── lib/
│   │   │       ├── logger.ts, email.ts, objectStorage.ts
│   │   └── dist/               # esbuild output
│   └── pos-app/                # React + Vite frontend
│       ├── src/
│       │   ├── App.tsx         # Routing, LoginForm, Signup, GoogleInvite
│       │   ├── components/
│       │   │   ├── layout.tsx  # Header, sidebar, bottom nav
│       │   │   ├── CloseShiftDialog.tsx
│       │   │   └── StartShiftDialog.tsx
│       │   ├── pages/
│       │   │   ├── cashier.tsx, dashboard.tsx, products.tsx
│       │   │   ├── orders.tsx, shift.tsx, pengeluaran.tsx
│       │   │   ├── inventory.tsx, users.tsx, branches.tsx, audits.tsx
│       │   ├── lib/
│       │   │   ├── csrf.ts     # apiFetch wrapper + initCsrf
│       │   │   ├── error.ts    # getErrorMessage sanitizer
│       │   │   └── branch.ts   # BranchProvider
│       │   └── index.css       # Lume's Aqua Glass design system
│       └── dist/public/        # vite build output
├── lib/
│   ├── db/src/schema/          # Drizzle ORM tables
│   │   ├── index.ts, users.ts, products.ts, orders.ts, shiftAudits.ts
│   │   ├── expenses.ts, ingredients.ts, semiFinished.ts
│   └── api-client-react/      # Generated API hooks
└── deploy.sh                   # Deployment script
```

## Tech Stack
- Frontend: React 19, Vite 7, Tailwind CSS 4, Shadcn/UI, Recharts, Framer Motion
- Backend: Express 5, Drizzle ORM, Passport.js, connect-pg-simple
- Database: PostgreSQL via Neon.tech
- Auth: Local strategy + Google OAuth 2.0
- Security: Helmet, CORS, CSRF (double-submit), rate-limit, pino logger

## Design System — "Lume's Aqua Glass"
- Primary: #1565FF
- Deep Ocean: #0A1F44
- Dark mode background: #071426
- Glassmorphism: backdrop-blur-xl, border-[#1565FF]/10
- Border-radius: rounded-2xl (16px) global
- Header: bg-gradient-to-r from-[#1565FF]/[0.06] via-background/80 to-background
- Cards: rounded-2xl border border-[#1565FF]/10 shadow-lg
- Buttons: touch-target, active:scale-[0.97]
- Mobile: gap-2, text-xs, h-8 icon buttons

## Routing
- Public: /sign-in, /sign-up, /reset-password, /sign-up/invite
- Protected: /, /orders, /shift, /pengeluaran, /inventory, /products, /audits, /dashboard, /branches, /users
- Role-based: branches/users = owner only, inventory/products/audits/dashboard = manager+

## Auth Flow
1. Local: email + password → passport.authenticate("local") → session
2. Google: → passport.authenticate("google") → redirect Google → callback
   - Existing user: login
   - New user + SIGNUP_CODE: redirect /sign-up/invite
3. Signup: email + password + invite code (SIGNUP_CODE env)
4. CSRF: pos-csrf cookie + x-csrf-token header, skipped on auth routes

## Key Patterns
- apiFetch() wrapper for all mutations (CSRF token auto-attached)
- getErrorMessage() sanitizes in production (import.meta.env.PROD)
- Branch access: canAccessBranch() + requireBranchAccess middleware
- Mobile-first: use flex/grid with sm: breakpoint, touch-target for buttons
- Dark mode: use var(--card), var(--background), no hardcoded bg-white
