/**
 * Lumé OS Architecture Freeze
 * T13X Phase 15
 *
 * Version 1.0.0 — Architecture Frozen
 *
 * From this point forward:
 * - No more architectural changes to the Desktop Layer
 * - All future development is applications or features
 * - Every ERP must use: Application Runtime, Application SDK, Shell API
 * - AI Runtime, RIC, Runtime Gateway, EIOS are system services
 *   accessed through contracts, not directly by apps
 */

/* ─── Version Information ─── */

export const LUME_OS_VERSION = "1.0.0" as const;

export const ARCHITECTURE_VERSION = "1.0.0" as const;

export const VERSION_INFO = {
  version: LUME_OS_VERSION,
  architecture: ARCHITECTURE_VERSION,
  codename: "Cloud Kernel",
  frozenAt: new Date("2026-07-19").toISOString(),
  frozenBy: "T13X Architecture Freeze",
  
  // What's frozen
  frozen: [
    "Desktop Shell",
    "Window Manager",
    "Dock Engine",
    "Workspace Runtime",
    "Theme Engine",
    "Motion Engine",
    "Event Bus",
    "Permission Engine",
    "Application Runtime",
    "Application Manifest",
    "Application SDK",
    "Shell API",
    "Notification Service",
    "Background Services",
    "Performance Contract",
    "Design Tokens",
    "Navigation Standard",
  ],
  
  // What can still change
  mutable: [
    "New Applications",
    "Application Features",
    "New Background Services",
    "New Search Providers",
    "New Event Schemas",
    "New Executive Roles",
    "New Workspace Presets",
    "UI refinements (within design system)",
  ],
  
  // Architecture rules
  rules: [
    "Applications MUST use Application Runtime lifecycle",
    "Applications MUST have a manifest.ts",
    "Applications MUST use Application SDK hooks",
    "Applications MUST NOT import from lib/desktop/* directly",
    "Applications MUST NOT modify shell components",
    "All communication MUST go through Event Bus",
    "All permissions MUST go through Permission Engine",
    "All search MUST go through Universal Search Engine",
    "All windows MUST follow Window Manager lifecycle",
    "All animations MUST use Motion Engine",
    "All styles MUST use Design Tokens",
    "All layouts MUST follow Navigation Standard",
    "All apps MUST meet Performance Contract",
  ],
} as const;

/* ─── Freeze Validation ─── */

export function validateArchitecture(): {
  frozen: boolean;
  version: string;
  timestamp: string;
  rules: string[];
} {
  return {
    frozen: true,
    version: LUME_OS_VERSION,
    timestamp: VERSION_INFO.frozenAt,
    rules: [...VERSION_INFO.rules],
  };
}

export function isFrozen(): boolean {
  return true;
}

export function getVersion(): string {
  return LUME_OS_VERSION;
}

export function getVersionInfo(): typeof VERSION_INFO {
  return VERSION_INFO;
}

/* ─── Architecture Decision Records ─── */

export interface ADR {
  id: string;
  title: string;
  status: "accepted" | "deprecated" | "superseded";
  date: string;
  decision: string;
  consequences: string[];
}

export const ARCHITECTURE_DECISIONS: ADR[] = [
  {
    id: "ADR-001",
    title: "Desktop as OS Kernel UI",
    status: "accepted",
    date: "2026-07-19",
    decision: "Cloud Desktop becomes the permanent OS foundation. All ERP applications become plugins. AI becomes a system service.",
    consequences: [
      "Desktop Shell is frozen at v1.0.0",
      "All applications must use Application Runtime",
      "No direct component-to-component calls",
      "All communication through Event Bus",
    ],
  },
  {
    id: "ADR-002",
    title: "Event-Driven Architecture",
    status: "accepted",
    date: "2026-07-19",
    decision: "All desktop communication is event-driven. No component calls another directly.",
    consequences: [
      "DesktopEventBus is the single communication backbone",
      "All domain events have typed schemas",
      "Applications emit events, shell reacts",
    ],
  },
  {
    id: "ADR-003",
    title: "Application Runtime Lifecycle",
    status: "accepted",
    date: "2026-07-19",
    decision: "Every application follows a 12-state lifecycle: created → initializing → loading → syncing → ready → active → background → sleeping → restoring → updating → crashed → destroyed.",
    consequences: [
      "No application renders React directly",
      "Runtime manages mounting and context injection",
      "Applications receive ShellContext, WorkspaceContext, WindowContext, ThemeContext, SessionContext, AIContext",
    ],
  },
  {
    id: "ADR-004",
    title: "Permission Engine at Shell Level",
    status: "accepted",
    date: "2026-07-19",
    decision: "All access control lives in the Desktop Shell, not in ERP. Role → Permission → Capability → Application → Feature → Action.",
    consequences: [
      "ERP applications do not manage their own permissions",
      "Shell checks permissions before launching apps",
      "Roles are hierarchical: viewer < operator < manager < admin < founder",
    ],
  },
  {
    id: "ADR-005",
    title: "AI as OS Service",
    status: "accepted",
    date: "2026-07-19",
    decision: "AI is not an application. AI is a native OS service. Every app automatically gets: Mission, Executive, Awareness, RuntimeContext, Notification.",
    consequences: [
      "AI Runtime runs as a background service",
      "Applications receive AI context through SDK",
      "Executives are assigned to apps via manifest",
      "Missions are system-wide, not per-app",
    ],
  },
  {
    id: "ADR-006",
    title: "Frozen Design Tokens",
    status: "accepted",
    date: "2026-07-19",
    decision: "All visual properties flow through Design Tokens. No component owns colors, spacing, or motion values.",
    consequences: [
      "ThemeEngine can change entire appearance",
      "High Contrast mode works everywhere",
      "Brand theme is possible",
      "Applications cannot override shell styles",
    ],
  },
  {
    id: "ADR-007",
    title: "Universal Search over Command Palette",
    status: "accepted",
    date: "2026-07-19",
    decision: "Ctrl+K opens Universal Search, not just Command Palette. Searches across: apps, workspaces, customers, products, invoices, employees, missions, knowledge, executives, tools, AI memory, documentation, files, and actions.",
    consequences: [
      "Search providers are extensible",
      "ERP data is searchable from the shell",
      "AI context is searchable",
      "Domain-specific providers for each ERP module",
    ],
  },
  {
    id: "ADR-008",
    title: "Background Services as Daemons",
    status: "accepted",
    date: "2026-07-19",
    decision: "Desktop has native background services that run as daemons, even when windows are closed.",
    consequences: [
      "Mission Service, Notification Service, Heartbeat Service, Executive Service, Sync Service",
      "ERP-specific sync services: Finance Sync, Inventory Sync, Knowledge Sync, Marketplace Sync",
      "Services are registered and managed by BackgroundServiceManager",
    ],
  },
  {
    id: "ADR-009",
    title: "Standard Navigation Pattern",
    status: "accepted",
    date: "2026-07-19",
    decision: "All ERP applications use: Menu → Sidebar → Toolbar → Content → Inspector → Status Bar.",
    consequences: [
      "AppLayout component provides standard structure",
      "Applications do not create custom layouts",
      "Consistent UX across all ERP modules",
    ],
  },
  {
    id: "ADR-010",
    title: "Performance Contract",
    status: "accepted",
    date: "2026-07-19",
    decision: "Every application must meet: Startup <200ms, Window Open <150ms, Background Resume <100ms, Memory <100MB, FPS 60.",
    consequences: [
      "PerformanceMonitor tracks all metrics",
      "Violations trigger console warnings",
      "Contract summary available via hook",
    ],
  },
];

export function getADRs(): ADR[] {
  return [...ARCHITECTURE_DECISIONS];
}

export function getADR(id: string): ADR | undefined {
  return ARCHITECTURE_DECISIONS.find((a) => a.id === id);
}
