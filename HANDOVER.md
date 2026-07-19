# Lumé OS — Handover Document

**Version**: 1.0
**Date**: July 19, 2026
**Status**: Home Screen v1.0 deployed, mobile-first, production live

---

## 1. PROJECT OVERVIEW

Lumé OS is a **cloud-based Operating System** embedded in a web application. It is NOT an ERP dashboard. It is NOT a POS dashboard. It is an OS where:

- The Home Screen acts as a **launcher + AI operating center**
- Every ERP module (POS, Finance, Inventory, CRM, HR, Marketplace, AI Chat, Settings) is an **APPLICATION**
- Applications open inside the OS shell, not as separate dashboards

**Design Philosophy**:
```
Operating System → Workspace → Applications → AI → Business
```

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 7 |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion |
| Routing | wouter (NOT react-router) |
| State | Module-level singleton stores + `useReducer` + `useEffect` + `useRef` |
| UI Library | shadcn/ui (53 components in `src/components/ui/`) |
| Icons | lucide-react ONLY |
| Auth | `useGetMe()` from `@workspace/api-client-react` |
| Server | Node.js, pm2, deploy via `git pull && pnpm build && pm2 restart` |
| Backend | `root@43.157.227.205` (IP `82.223.100.20`) |

**CRITICAL RULES**:
- No new npm dependencies
- lucide-react icons ONLY accept `className`, NOT `style` — wrap in `<span style={{color}}>` for dynamic colors
- `useIsMobile()` from `@/hooks/use-mobile` (NOT `useMediaQuery`)
- All animations: 200ms, no bounce, no overscale, feels Apple

---

## 3. COLOR SYSTEM

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#2563EB` | Buttons, active states, links |
| Accent | `#3B82F6` | Hover states |
| Background | `#F6F8FC` | Page background (light theme) |
| Card | `#FFFFFF` | Card backgrounds |
| Danger | `#EF4444` | Errors, destructive actions |
| Success | `#10B981` | Positive trends, online status |
| Warning | `#F59E0B` | Warnings, low stock |
| Text | `#111827` | Primary text |
| Secondary Text | `#6B7280` | Descriptions, metadata |
| Radius | `20px` (rounded-2xl) | Cards, buttons |
| Shadow | Very soft | `0 1px 3px rgba(0,0,0,0.04)` |

---

## 4. FILE STRUCTURE

```
src/
├── components/
│   ├── home/                    # ← NEW Home Screen (active)
│   │   ├── HomeScreen.tsx       # Main assembly (manages tabs + app overlay)
│   │   ├── StatusBar.tsx        # iOS-style status bar
│   │   ├── HomeHeader.tsx       # Hamburger + title + notification + avatar
│   │   ├── GreetingSection.tsx  # "Selamat Pagi, Nama 👋"
│   │   ├── RuntimeStatus.tsx    # Green pill — executives online
│   │   ├── BusinessCard.tsx     # Individual stat card (loading/error/empty)
│   │   ├── BusinessOverview.tsx # 4 cards container
│   │   ├── DigitalTwinHero.tsx  # Gradient hero section
│   │   ├── AppCard.tsx          # Individual app icon card
│   │   ├── ApplicationGrid.tsx  # 4-column app grid
│   │   ├── AIInsight.tsx        # AI insight card
│   │   ├── FloatingAI.tsx       # 64px floating AI button
│   │   └── BottomNav.tsx        # 5-tab bottom navigation
│   ├── desktop/
│   │   └── apps/                # App placeholder components
│   │       ├── POSPlaceholder.tsx      # Full POS shell with sidebar + BranchProvider
│   │       ├── FinancePlaceholder.tsx  # Stub
│   │       ├── InventoryPlaceholder.tsx # Stub
│   │       ├── CRMPlaceholder.tsx      # Stub
│   │       ├── HRPlaceholder.tsx       # Stub
│   │       ├── AIChatPlaceholder.tsx   # Stub with input
│   │       ├── MarketplacePlaceholder.tsx # Stub
│   │       └── SettingsPlaceholder.tsx # Stub with sidebar
│   ├── ui/                      # shadcn/ui components (53 files)
│   ├── layout.tsx               # Cashier layout (sidebar + mobile nav)
│   ├── ai-agent-popup.tsx       # AI agent floating popup
│   ├── active-missions.tsx      # Active missions display
│   ├── mission-detail.tsx       # Mission detail view
│   ├── runtime-progress-card.tsx # Runtime progress card
│   ├── markdown-renderer.tsx    # Markdown renderer
│   ├── StartShiftDialog.tsx     # Start shift dialog
│   └── CloseShiftDialog.tsx     # Close shift dialog
├── lib/
│   ├── home/                    # ← NEW Home data layer
│   │   ├── widget-provider.ts   # useWidgetProvider<T> hook
│   │   └── home-data.ts         # Mock data + formatIDR
│   ├── desktop/                 # Minimal surviving desktop libs
│   │   ├── types.ts             # AppDefinition, WindowState, etc.
│   │   ├── registry.ts          # appRegistry (8 apps)
│   │   ├── executive-store.ts   # 7 AI executives state
│   │   └── notification-store.ts # Notifications state
│   ├── branch.tsx               # BranchProvider + useBranch()
│   ├── csrf.ts                  # apiFetch() wrapper
│   ├── utils.ts                 # cn() utility
│   ├── format.ts                # Formatting helpers
│   ├── error.ts                 # getErrorMessage()
│   ├── sync-engine.ts           # Offline/online sync
│   └── offline-db.ts            # IndexedDB storage
├── hooks/
│   ├── use-mobile.tsx           # useIsMobile() — < 768px
│   ├── useOnlineStatus.ts       # Online/offline tracking
│   └── use-toast.ts             # Toast notifications
├── pages/
│   ├── cloud-desktop.tsx        # Owner/Manager entry → HomeScreen
│   ├── cashier.tsx              # POS cashier page
│   ├── inventory.tsx            # Inventory management
│   ├── products.tsx             # Product management
│   ├── orders.tsx               # Order history
│   ├── dashboard.tsx            # Reports/dashboard
│   ├── branches.tsx             # Branch management
│   ├── users.tsx                # User management
│   ├── shift.tsx                # Shift close/start
│   ├── pengeluaran.tsx          # Expenses
│   ├── audits.tsx               # Shift audits
│   ├── onboard.tsx              # Cashier onboarding
│   ├── executive.tsx            # Executive workspace
│   ├── eng-os.tsx               # Engineering OS
│   └── not-found.tsx            # 404 page
├── App.tsx                      # Root routing
└── index.css                    # Global styles + Tailwind
```

---

## 5. ROUTING ARCHITECTURE

File: `src/App.tsx`

```
Unauthenticated:
  /sign-in        → SignIn page
  /sign-up        → SignUp page
  /reset-password → ResetPassword page

Authenticated (ProtectedApp):
  role === "owner" || role === "manager"
    → CloudDesktopPage → HomeScreen

  role === "cashier"
    → BranchProvider → Layout → cashier routes:
      /           → CashierPage
      /onboard    → OnboardPage
      /orders     → OrdersPage
      /shift      → ShiftPage
      /pengeluaran → PengeluaranPage
      /inventory  → InventoryPage

  /desktop → CloudDesktopPage → HomeScreen (direct)
```

**Key**: Owner/Manager ALWAYS sees HomeScreen. Cashier ALWAYS sees cashier layout. There is NO overlap.

---

## 6. HOME SCREEN ARCHITECTURE

### 6.1 Layout Hierarchy (top to bottom)

```
StatusBar          (44px, iOS-style)
HomeHeader         (56px, hamburger + title + notification + avatar)
GreetingSection    ("Selamat Pagi, Nama 👋")
RuntimeStatus      (green pill)
BusinessOverview   (4 cards: Uang Hari Ini, Arus Kas, Profit, Misi)
DigitalTwinHero    (~180px, gradient hero)
ApplicationGrid    (4-column, 8 apps from appRegistry)
AIInsight          (max 3 items)
FloatingAI         (64px, fixed bottom-right)
BottomNav          (5 tabs, fixed bottom)
```

### 6.2 Tab System

BottomNav manages 5 tabs:
- **Home** → full home layout (all sections)
- **Apps** → app grid only
- **Mission** → placeholder ("Segera hadir")
- **AI** → placeholder (triggers floating AI)
- **Profile** → user info + sign out

### 6.3 App Opening Mechanism

When an app is tapped:
1. `HomeScreen` sets `activeApp` state to the app's ID
2. `AppView` component renders the app's `component` from `appRegistry`
3. A back button in the header returns to home

**No routing involved** — pure state-based. Apps render full-screen overlay within HomeScreen.

### 6.4 WidgetDataProvider Pattern

Every business card uses this pattern:

```typescript
// src/lib/home/widget-provider.ts
interface WidgetState<T> {
  loading: boolean;
  error: string | null;
  data: T | null;
}

function useWidgetProvider<T>(fetcher: () => Promise<T>): WidgetState<T> & { refresh: () => Promise<void> }
```

Usage:
```tsx
const cash = useWidgetProvider(fetchCashToday, []);
// cash.loading → show skeleton
// cash.error → show error + retry button
// cash.data → show value
// cash.refresh → retry fetch
```

**Mock data** in `src/lib/home/home-data.ts`:
- `fetchCashToday()` → `{ amount: 2450000, change: 8.4 }`
- `fetchCashflow()` → `{ amount: 12500000, change: 2.1 }`
- `fetchProfit()` → `{ amount: 3200000, change: -1.3 }`
- `fetchMissions()` → `{ active: 3, total: 7 }`
- `fetchInsights()` → 3 items

**To connect real API**: Replace the fetcher function body. UI remains unchanged.

---

## 7. APPLICATION REGISTRY

File: `src/lib/desktop/registry.ts`

```typescript
appRegistry: AppDefinition[] = [
  { id: "pos",         title: "POS",         icon: "ShoppingBag",  color: "#2563EB", component: POSPlaceholder },
  { id: "finance",     title: "Finance",     icon: "TrendingUp",   color: "#059669", component: FinancePlaceholder },
  { id: "inventory",   title: "Inventory",   icon: "Package",      color: "#D97706", component: InventoryPlaceholder },
  { id: "crm",         title: "CRM",         icon: "Users",        color: "#7C3AED", component: CRMPlaceholder },
  { id: "hr",          title: "HR",          icon: "UserCog",      color: "#DC2626", component: HRPlaceholder },
  { id: "ai-chat",     title: "AI Chat",     icon: "Sparkles",     color: "#0EA5E9", component: AIChatPlaceholder },
  { id: "marketplace", title: "Marketplace", icon: "Store",        color: "#EA580C", component: MarketplacePlaceholder },
  { id: "settings",    title: "Settings",    icon: "Settings",     color: "#64748B", component: SettingsPlaceholder },
]
```

**NEVER hardcode** app list in UI. Always `map()` from `appRegistry`.

---

## 8. POS APPLICATION (MOST COMPLETE)

`POSPlaceholder.tsx` is the only fully-built application. It renders:

- **BranchProvider** wrapper (required by all child pages)
- **Sidebar navigation** with 10 pages:
  - Kasir (CashierPage)
  - Stok & Bahan (InventoryPage)
  - Produk (ProductsPage)
  - Laporan (DashboardPage)
  - Riwayat (OrdersPage)
  - Tutup Shift (ShiftPage)
  - Pengeluaran (PengeluaranPage)
  - Audit Shift (AuditsPage)
  - Cabang (BranchesPage)
  - Pengguna (UsersPage)
- **Branch selector** (Select dropdown)
- **Error boundary** per page (PageBoundary class component)
- **Theme toggle** (dark/light via next-themes)
- **Offline indicator**

---

## 9. AUTH SYSTEM

- **Login**: `fetch("/api/auth/login")` → `queryClient.invalidateQueries()` → refetch `me`
- **Auth check**: `useGetMe()` from `@workspace/api-client-react` → `GET /api/users/me`
- **User shape**: `{ name, email, role, branchId, allowedBranches }`
- **Roles**: `"owner" | "manager" | "cashier"`
- **Logout**: `apiFetch("/api/auth/logout")` + invalidate queries + redirect to `/sign-in`
- **CSRF**: `initCsrf()` called once in ProtectedApp, fetches token from `/api/csrf-token`

---

## 10. EXISTING PAGES (NOT PART OF HOME SCREEN)

These pages exist and work, but are NOT on the Home Screen. They're accessed via the POS application sidebar:

| Page | File | Purpose |
|------|------|---------|
| CashierPage | `cashier.tsx` | Main POS interface |
| InventoryPage | `inventory.tsx` | Stock management |
| ProductsPage | `products.tsx` | Product CRUD |
| OrdersPage | `orders.tsx` | Order history |
| DashboardPage | `dashboard.tsx` | Reports |
| ShiftPage | `shift.tsx` | Shift management |
| PengeluaranPage | `pengeluaran.tsx` | Expenses |
| AuditsPage | `audits.tsx` | Shift audits |
| BranchesPage | `branches.tsx` | Branch management |
| UsersPage | `users.tsx` | User management |

---

## 11. DESIGN CONSTRAINTS (MUST FOLLOW)

### Absolute Restrictions
Do NOT create on the Home Screen:
- ❌ ERP Dashboard
- ❌ Large Charts / Pie Charts
- ❌ Data Tables / Reports
- ❌ Accounting / POS / CRM / Inventory screens
- ❌ Long Lists / Analytics Dashboard
- ❌ Anything that looks like a business dashboard

### Component Rules
- Every section must be isolated (separate file)
- No component over 300 lines
- Every widget must support: Loading → Skeleton → Success → Empty → Error
- Every error state must have Retry button
- Animations: 200ms, Framer Motion, no bounce

### Data Rules
- NO UI component may directly contain business data
- Every widget must consume data through Provider abstraction
- Mock data allowed during development, but must pass through provider interface

---

## 12. WHAT'S NEXT (NOT YET BUILT)

### Immediate (Home Screen gaps):
1. **GreetingSection** — currently hardcodes "Pengguna". Should use `user.name` from props
2. **Finance app** — `FinancePlaceholder` is a stub. Need real `FinancePage`
3. **Inventory app** — `InventoryPlaceholder` is a stub. Need to render `InventoryPage` inside
4. **CRM, HR, Marketplace, Settings** — all stubs, need real pages
5. **AI Chat** — stub, needs Executive Runtime integration
6. **Digital Twin Hero** — currently mock sentence. Should connect to AI Runtime

### Medium term:
7. **Window Manager** — apps should open as draggable/resizable windows (not full-screen overlay)
8. **Desktop widgets** — clock, weather, system status widgets on home screen
9. **Workspace system** — multiple workspaces for different contexts
10. **Command Palette** — Ctrl+K search across all apps and commands

### Long term:
11. **Desktop mode** — full desktop experience for large screens
12. **Plugin system** — third-party app integrations
13. **Real-time collaboration** — multi-user concurrent editing

---

## 13. DEPLOYMENT

```bash
# SSH to server
ssh root@43.157.227.205

# Pull, build, restart
cd ~/lumespos
git pull origin main
pnpm --filter ./artifacts/pos-app run build
pm2 restart pos-api
```

**Server**: `root@43.157.227.205`
**App URL**: `http://82.223.100.20` (or nip.io domain)
**PM2 process**: `pos-api`

---

## 14. KNOWN ISSUES

1. **TypeScript errors** — 7 pre-existing errors in `App.tsx`, `layout.tsx`, `offline-db.ts`, `eng-os.tsx`, `executive.tsx`. NOT from Home Screen code.
2. **Bundle size** — 1.3MB JS (mostly due to shadcn/ui + framer-motion). Consider code splitting.
3. **POSPlaceholder** — uses dark theme colors (`text-white/90`, `text-white/40`) in its stub content. Works but looks odd in light Home Screen context.
4. **FinancePlaceholder, InventoryPlaceholder** — stubs that show dark-themed placeholder text. Should be replaced with real pages.
5. **No BranchProvider** on Home Screen — apps that need branch selection (POS, Finance, Inventory) handle it internally via their placeholder wrappers.

---

## 15. QUICK REFERENCE

### Adding a new app to the registry:
```typescript
// 1. Create component in src/components/desktop/apps/MyApp.tsx
// 2. Add to appRegistry in src/lib/desktop/registry.ts:
{ id: "my-app", title: "My App", icon: "IconName", color: "#HEX", component: MyApp }
// 3. Add icon mapping in src/components/home/AppCard.tsx
```

### Adding a new business widget:
```typescript
// 1. Create fetcher in src/lib/home/home-data.ts
export async function fetchMyData(): Promise<MyData> { ... }

// 2. Create card component
function MyCard() {
  const { data, loading, error, refresh } = useWidgetProvider(fetchMyData, []);
  // render with loading/error/empty states
}

// 3. Add to BusinessOverview.tsx grid
```

### Connecting mock to real API:
```typescript
// In home-data.ts, replace mock:
export async function fetchCashToday(): Promise<CashTodayData> {
  const res = await apiFetch("/api/finance/cash-today");
  return res.json();
}
// UI remains 100% unchanged
```

---

*End of handover document.*
