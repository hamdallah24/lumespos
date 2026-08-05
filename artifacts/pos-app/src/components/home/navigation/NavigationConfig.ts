import type {
  NavigationSectionDefinition,
  NavigationGroupDefinition,
  NavigationItemDefinition,
} from "./types";

/**
 * NavigationConfig — single source of truth seluruh menu Operating System.
 * Drawer navigator membaca dari sini; HomeScreen tidak tahu detail menu.
 *
 * Dua jenis target:
 *  - `app`  : buka aplikasi di dalam HomeScreen (setActiveApp)
 *  - `route`: pindah ke workspace OS sendiri (setLocation) — sesuai arsitektur
 *             di mana Executive/EngOS/BI/Founder/Audit/Branches/Users/Settings
 *             BUKAN bagian dari aplikasi POS, melainkan Operating System.
 */
export const navigationSections: NavigationSectionDefinition[] = [
  {
    id: "workspace",
    label: "Workspace",
    groups: [
      {
        id: "home",
        label: "Home",
        items: [
          {
            id: "home",
            label: "Home",
            description: "Kembali ke layar utama",
            icon: "Home",
            color: "#2563EB",
            keywords: ["home", "beranda", "utama", "dashboard"],
            target: { kind: "route", href: "/" },
          },
        ],
      },
    ],
  },
  {
    id: "operating-system",
    label: "Operating System",
    groups: [
      {
        id: "executive",
        label: "Executive",
        icon: "Crown",
        color: "#7C3AED",
        items: [
          {
            id: "exec-ceo",
            label: "CEO",
            description: "Chief Executive Officer",
            icon: "Crown",
            color: "#2563EB",
            keywords: ["ceo", "chief executive", "executive"],
            target: { kind: "route", href: "/executive" },
          },
          {
            id: "exec-coo",
            label: "COO",
            description: "Chief Operating Officer",
            icon: "Layers",
            color: "#059669",
            keywords: ["coo", "chief operating"],
            target: { kind: "route", href: "/executive" },
          },
          {
            id: "exec-cfo",
            label: "CFO",
            description: "Chief Financial Officer",
            icon: "Wallet",
            color: "#D97706",
            keywords: ["cfo", "chief financial"],
            target: { kind: "route", href: "/executive" },
          },
          {
            id: "exec-cmo",
            label: "CMO",
            description: "Chief Marketing Officer",
            icon: "Megaphone",
            color: "#DC2626",
            keywords: ["cmo", "chief marketing"],
            target: { kind: "route", href: "/executive" },
          },
          {
            id: "exec-chro",
            label: "CHRO",
            description: "Chief Human Resources Officer",
            icon: "UserRoundPlus",
            color: "#EA580C",
            keywords: ["chro", "hr", "human resources"],
            target: { kind: "route", href: "/executive" },
          },
          {
            id: "exec-cto",
            label: "CTO",
            description: "Chief Technology Officer",
            icon: "Brain",
            color: "#0EA5E9",
            keywords: ["cto", "chief technology"],
            target: { kind: "route", href: "/executive" },
          },
          {
            id: "exec-caio",
            label: "CAIO",
            description: "Chief Artificial Intelligence Officer",
            icon: "Sparkles",
            color: "#8B5CF6",
            keywords: ["caio", "ai", "artificial intelligence"],
            target: { kind: "route", href: "/executive" },
          },
          {
            id: "exec-cko",
            label: "CKO",
            description: "Chief Knowledge Officer",
            icon: "FileBarChart",
            color: "#0891B2",
            keywords: ["cko", "knowledge", "insight"],
            target: { kind: "route", href: "/executive" },
          },
        ],
      },
      {
        id: "business",
        label: "Business",
        icon: "Briefcase",
        color: "#2563EB",
        items: [
          {
            id: "app-pos",
            label: "POS",
            description: "Point of Sale & checkout",
            icon: "ShoppingBag",
            color: "#2563EB",
            keywords: ["pos", "kasir", "checkout"],
            target: { kind: "app", appId: "pos" },
          },
          {
            id: "app-inventory",
            label: "Inventory",
            description: "Stock management & alerts",
            icon: "Package",
            color: "#D97706",
            keywords: ["inventory", "stock", "stok", "persediaan"],
            target: { kind: "app", appId: "inventory" },
          },
          {
            id: "app-finance",
            label: "Finance",
            description: "Revenue, cashflow & reports",
            icon: "TrendingUp",
            color: "#059669",
            keywords: ["finance", "keuangan", "revenue", "cashflow"],
            target: { kind: "app", appId: "finance" },
          },
          {
            id: "app-purchasing",
            label: "Purchasing",
            description: "Procurement & supplier management",
            icon: "ShoppingCart",
            color: "#EA580C",
            keywords: ["purchasing", "procurement", "supplier", "pembelian"],
            target: { kind: "app", appId: "purchasing" },
          },
          {
            id: "app-hr",
            label: "HR",
            description: "Staff, payroll & shifts",
            icon: "UserCog",
            color: "#DC2626",
            keywords: ["hr", "staff", "payroll", "karyawan"],
            target: { kind: "app", appId: "hr" },
          },
          {
            id: "app-crm",
            label: "CRM",
            description: "Customers & relationships",
            icon: "Users",
            color: "#7C3AED",
            keywords: ["crm", "customer", "pelanggan"],
            target: { kind: "app", appId: "crm" },
          },
        ],
      },
      {
        id: "intelligence",
        label: "Intelligence",
        icon: "Brain",
        color: "#0EA5E9",
        items: [
          {
            id: "business-intelligence",
            label: "Business Intelligence",
            description: "Analytics, data & insight",
            icon: "BarChart3",
            color: "#0891B2",
            keywords: ["business intelligence", "bi", "analytics", "data", "insight"],
            target: { kind: "route", href: "/business-intelligence" },
          },
          {
            id: "eng-os",
            label: "EngOS",
            description: "Engineering Operating System",
            icon: "HardHat",
            color: "#64748B",
            keywords: ["eng-os", "engineering", "devops", "pipeline"],
            target: { kind: "route", href: "/eng-os" },
          },
          {
            id: "founder",
            label: "Founder",
            description: "Founder operating room",
            icon: "Rocket",
            color: "#4F46E5",
            keywords: ["founder", "vision", "strategy", "pendiri"],
            target: { kind: "route", href: "/founder" },
          },
          {
            id: "ai",
            label: "AI",
            description: "AI Executive Intelligence",
            icon: "Sparkles",
            color: "#0EA5E9",
            keywords: ["ai", "chat", "ai chat", "assistant"],
            target: { kind: "app", appId: "ai-chat" },
          },
        ],
      },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    groups: [
      {
        id: "admin",
        label: "Management",
        icon: "Shield",
        color: "#1F2937",
        items: [
          {
            id: "audit",
            label: "Audit",
            description: "Shift audit & transaksi",
            icon: "LayoutDashboard",
            color: "#D97706",
            keywords: ["audit", "audit shift", "shift audit"],
            target: { kind: "route", href: "/audit" },
          },
          {
            id: "branches",
            label: "Branches",
            description: "Kelola cabang",
            icon: "Store",
            color: "#059669",
            keywords: ["branches", "cabang", "outlet", "store"],
            target: { kind: "route", href: "/branches" },
          },
          {
            id: "users",
            label: "Users",
            description: "Kelola pengguna & akses",
            icon: "Users",
            color: "#7C3AED",
            keywords: ["users", "pengguna", "user", "akun"],
            target: { kind: "route", href: "/users" },
          },
          {
            id: "settings",
            label: "Settings",
            description: "Konfigurasi sistem",
            icon: "Settings",
            color: "#64748B",
            keywords: ["settings", "pengaturan", "config"],
            target: { kind: "route", href: "/settings" },
          },
        ],
      },
    ],
  },
];

/** Helper: flatten seluruh item untuk pencarian / favorite / recent. */
export function flattenNavigationItems(): NavigationItemDefinition[] {
  const items: NavigationItemDefinition[] = [];
  for (const section of navigationSections) {
    for (const group of section.groups) {
      items.push(...group.items);
    }
  }
  return items;
}

export function findNavigationItem(id: string): NavigationItemDefinition | undefined {
  return flattenNavigationItems().find((item) => item.id === id);
}

export function getNavigationGroups(): NavigationGroupDefinition[] {
  return navigationSections.flatMap((section) => section.groups);
}