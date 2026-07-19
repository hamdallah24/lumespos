/**
 * Lumé OS Application Manifest System
 * T13X Phase 2
 *
 * Every application has a manifest.ts.
 * Manifests are the single source of truth.
 * Dock, registry, and search all read from manifests.
 */

/* ─── Manifest Types ─── */

export interface AppManifest {
  id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  icon: string;
  color: string;
  category: "core" | "business" | "system" | "ai" | "marketplace";
  owner: string;                    // team/person who owns the app
  executiveOwner: string;           // which AI executive oversees this app (CEO, CTO, etc.)
  
  // Permissions
  permissions: string[];            // required permission IDs
  requiredCapabilities: string[];   // system capabilities needed
  requiredServices: string[];       // background services needed
  
  // Dependencies
  dependencies: string[];           // other app IDs this depends on
  
  // Access Control
  minimumRole: "viewer" | "operator" | "manager" | "admin" | "founder";
  
  // Workspace
  defaultWorkspace: string;         // workspace ID to add to by default
  
  // Window Configuration
  windowConfig: {
    defaultWidth: number;
    defaultHeight: number;
    minWidth: number;
    minHeight: number;
    allowMultiple: boolean;
    canPin: boolean;
    canFullscreen: boolean;
    canSplit: boolean;
    resizable: boolean;
  };
  
  // Features
  notificationSupport: boolean;
  deepLinks: string[];              // e.g., ["pos://product/123", "pos://cart"]
  offlineSupport: boolean;
  backgroundMode: boolean;          // can run as background service
  autoStart: boolean;               // start when desktop loads
  singleton: boolean;               // only one instance allowed
  
  // Component (lazy-loaded)
  component: () => Promise<{ default: React.ComponentType }>;
}

/* ─── Manifest Registry ─── */

const manifests = new Map<string, AppManifest>();

export function registerManifest(manifest: AppManifest): void {
  manifests.set(manifest.id, manifest);
}

export function registerManifests(manifestsToRegister: AppManifest[]): void {
  manifestsToRegister.forEach((m) => manifests.set(m.id, m));
}

export function getManifest(id: string): AppManifest | undefined {
  return manifests.get(id);
}

export function getAllManifests(): AppManifest[] {
  return Array.from(manifests.values());
}

export function getManifestsByCategory(category: AppManifest["category"]): AppManifest[] {
  return Array.from(manifests.values()).filter((m) => m.category === category);
}

export function getManifestsByRole(role: string): AppManifest[] {
  const roleHierarchy: Record<string, number> = {
    viewer: 0,
    operator: 1,
    manager: 2,
    admin: 3,
    founder: 4,
  };
  const userLevel = roleHierarchy[role] ?? 0;
  return Array.from(manifests.values()).filter((m) => {
    const requiredLevel = roleHierarchy[m.minimumRole] ?? 0;
    return userLevel >= requiredLevel;
  });
}

export function searchManifests(query: string): AppManifest[] {
  if (!query.trim()) return getAllManifests();
  const lower = query.toLowerCase();
  return Array.from(manifests.values()).filter((m) => {
    const searchable = [
      m.name,
      m.displayName,
      m.description,
      m.category,
      m.owner,
      ...m.permissions,
      ...m.deepLinks,
    ]
      .join(" ")
      .toLowerCase();
    return searchable.includes(lower);
  });
}

export function getManifestsByPermission(permissionId: string): AppManifest[] {
  return Array.from(manifests.values()).filter((m) =>
    m.permissions.includes(permissionId)
  );
}

export function getAutoStartManifests(): AppManifest[] {
  return Array.from(manifests.values()).filter((m) => m.autoStart);
}

export function getSingletonManifests(): AppManifest[] {
  return Array.from(manifests.values()).filter((m) => m.singleton);
}

/* ─── Default Manifests (for existing placeholder apps) ─── */

export const DEFAULT_MANIFESTS: AppManifest[] = [
  {
    id: "pos",
    name: "POS",
    displayName: "Point of Sale",
    version: "1.0.0",
    description: "Point of Sale terminal for transactions",
    icon: "ShoppingBag",
    color: "#2563EB",
    category: "core",
    owner: "erp-team",
    executiveOwner: "coo",
    permissions: ["pos.read", "pos.write", "inventory.read"],
    requiredCapabilities: ["camera", "printer"],
    requiredServices: ["inventory-sync", "finance-sync"],
    dependencies: [],
    minimumRole: "operator",
    defaultWorkspace: "default",
    windowConfig: {
      defaultWidth: 900,
      defaultHeight: 600,
      minWidth: 600,
      minHeight: 400,
      allowMultiple: true,
      canPin: true,
      canFullscreen: true,
      canSplit: false,
      resizable: true,
    },
    notificationSupport: true,
    deepLinks: ["pos://product/:id", "pos://cart"],
    offlineSupport: true,
    backgroundMode: false,
    autoStart: false,
    singleton: false,
    component: () => import("@/components/desktop/apps/POSPlaceholder"),
  },
  {
    id: "finance",
    name: "Finance",
    displayName: "Finance",
    version: "1.0.0",
    description: "Financial management and reporting",
    icon: "TrendingUp",
    color: "#059669",
    category: "business",
    owner: "erp-team",
    executiveOwner: "cfo",
    permissions: ["finance.read", "finance.write"],
    requiredCapabilities: [],
    requiredServices: ["finance-sync"],
    dependencies: [],
    minimumRole: "manager",
    defaultWorkspace: "finance",
    windowConfig: {
      defaultWidth: 850,
      defaultHeight: 550,
      minWidth: 600,
      minHeight: 400,
      allowMultiple: true,
      canPin: true,
      canFullscreen: true,
      canSplit: true,
      resizable: true,
    },
    notificationSupport: true,
    deepLinks: ["finance://invoice/:id", "finance://report/:type"],
    offlineSupport: false,
    backgroundMode: false,
    autoStart: false,
    singleton: false,
    component: () => import("@/components/desktop/apps/FinancePlaceholder"),
  },
  {
    id: "inventory",
    name: "Inventory",
    displayName: "Inventory",
    version: "1.0.0",
    description: "Stock and inventory management",
    icon: "Package",
    color: "#D97706",
    category: "business",
    owner: "erp-team",
    executiveOwner: "coo",
    permissions: ["inventory.read", "inventory.write"],
    requiredCapabilities: [],
    requiredServices: ["inventory-sync"],
    dependencies: [],
    minimumRole: "operator",
    defaultWorkspace: "default",
    windowConfig: {
      defaultWidth: 850,
      defaultHeight: 550,
      minWidth: 600,
      minHeight: 400,
      allowMultiple: true,
      canPin: true,
      canFullscreen: true,
      canSplit: true,
      resizable: true,
    },
    notificationSupport: true,
    deepLinks: ["inventory://product/:id", "inventory://stock"],
    offlineSupport: true,
    backgroundMode: false,
    autoStart: false,
    singleton: false,
    component: () => import("@/components/desktop/apps/InventoryPlaceholder"),
  },
  {
    id: "crm",
    name: "CRM",
    displayName: "CRM",
    version: "1.0.0",
    description: "Customer relationship management",
    icon: "Users",
    color: "#7C3AED",
    category: "business",
    owner: "erp-team",
    executiveOwner: "cmo",
    permissions: ["crm.read", "crm.write"],
    requiredCapabilities: [],
    requiredServices: ["knowledge-sync"],
    dependencies: [],
    minimumRole: "operator",
    defaultWorkspace: "default",
    windowConfig: {
      defaultWidth: 800,
      defaultHeight: 500,
      minWidth: 600,
      minHeight: 400,
      allowMultiple: true,
      canPin: true,
      canFullscreen: true,
      canSplit: true,
      resizable: true,
    },
    notificationSupport: true,
    deepLinks: ["crm://customer/:id", "crm://lead/:id"],
    offlineSupport: false,
    backgroundMode: false,
    autoStart: false,
    singleton: false,
    component: () => import("@/components/desktop/apps/CRMPlaceholder"),
  },
  {
    id: "hr",
    name: "HR",
    displayName: "HR",
    version: "1.0.0",
    description: "Human resources management",
    icon: "UserCog",
    color: "#DC2626",
    category: "business",
    owner: "erp-team",
    executiveOwner: "chro",
    permissions: ["hr.read", "hr.write"],
    requiredCapabilities: [],
    requiredServices: [],
    dependencies: [],
    minimumRole: "manager",
    defaultWorkspace: "default",
    windowConfig: {
      defaultWidth: 800,
      defaultHeight: 500,
      minWidth: 600,
      minHeight: 400,
      allowMultiple: true,
      canPin: true,
      canFullscreen: true,
      canSplit: true,
      resizable: true,
    },
    notificationSupport: true,
    deepLinks: ["hr://employee/:id", "hr://attendance"],
    offlineSupport: false,
    backgroundMode: false,
    autoStart: false,
    singleton: false,
    component: () => import("@/components/desktop/apps/HRPlaceholder"),
  },
  {
    id: "ai-chat",
    name: "AI Chat",
    displayName: "AI Chat",
    version: "1.0.0",
    description: "Direct AI assistant interface",
    icon: "Sparkles",
    color: "#0EA5E9",
    category: "ai",
    owner: "ai-team",
    executiveOwner: "caio",
    permissions: ["ai.chat"],
    requiredCapabilities: [],
    requiredServices: ["executive-service", "mission-service"],
    dependencies: [],
    minimumRole: "viewer",
    defaultWorkspace: "executive",
    windowConfig: {
      defaultWidth: 480,
      defaultHeight: 600,
      minWidth: 360,
      minHeight: 400,
      allowMultiple: false,
      canPin: true,
      canFullscreen: false,
      canSplit: false,
      resizable: true,
    },
    notificationSupport: true,
    deepLinks: ["ai://chat", "ai://mission/:id"],
    offlineSupport: false,
    backgroundMode: false,
    autoStart: false,
    singleton: true,
    component: () => import("@/components/desktop/apps/AIChatPlaceholder"),
  },
  {
    id: "marketplace",
    name: "Marketplace",
    displayName: "Marketplace",
    version: "1.0.0",
    description: "App marketplace and extensions",
    icon: "Store",
    color: "#EA580C",
    category: "marketplace",
    owner: "platform-team",
    executiveOwner: "cto",
    permissions: ["marketplace.read"],
    requiredCapabilities: [],
    requiredServices: [],
    dependencies: [],
    minimumRole: "viewer",
    defaultWorkspace: "default",
    windowConfig: {
      defaultWidth: 850,
      defaultHeight: 550,
      minWidth: 600,
      minHeight: 400,
      allowMultiple: true,
      canPin: true,
      canFullscreen: true,
      canSplit: true,
      resizable: true,
    },
    notificationSupport: false,
    deepLinks: ["marketplace://app/:id"],
    offlineSupport: false,
    backgroundMode: false,
    autoStart: false,
    singleton: false,
    component: () => import("@/components/desktop/apps/MarketplacePlaceholder"),
  },
  {
    id: "settings",
    name: "Settings",
    displayName: "Settings",
    version: "1.0.0",
    description: "System settings and preferences",
    icon: "Settings",
    color: "#64748B",
    category: "system",
    owner: "platform-team",
    executiveOwner: "cto",
    permissions: ["settings.read", "settings.write"],
    requiredCapabilities: [],
    requiredServices: [],
    dependencies: [],
    minimumRole: "viewer",
    defaultWorkspace: "default",
    windowConfig: {
      defaultWidth: 700,
      defaultHeight: 480,
      minWidth: 500,
      minHeight: 400,
      allowMultiple: false,
      canPin: false,
      canFullscreen: false,
      canSplit: false,
      resizable: true,
    },
    notificationSupport: false,
    deepLinks: ["settings://", "settings://theme", "settings://permissions"],
    offlineSupport: true,
    backgroundMode: false,
    autoStart: false,
    singleton: true,
    component: () => import("@/components/desktop/apps/SettingsPlaceholder"),
  },
];

/* ─── Auto-register defaults ─── */
registerManifests(DEFAULT_MANIFESTS);
