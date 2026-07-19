import type { AppDefinition } from "./types";
import POSPlaceholder from "@/components/desktop/apps/POSPlaceholder";
import FinancePlaceholder from "@/components/desktop/apps/FinancePlaceholder";
import InventoryPlaceholder from "@/components/desktop/apps/InventoryPlaceholder";
import CRMPlaceholder from "@/components/desktop/apps/CRMPlaceholder";
import HRPlaceholder from "@/components/desktop/apps/HRPlaceholder";
import AIChatPlaceholder from "@/components/desktop/apps/AIChatPlaceholder";
import MarketplacePlaceholder from "@/components/desktop/apps/MarketplacePlaceholder";
import SettingsPlaceholder from "@/components/desktop/apps/SettingsPlaceholder";

export const appRegistry: AppDefinition[] = [
  {
    id: "pos",
    title: "POS",
    icon: "ShoppingBag",
    color: "#2563EB",
    component: POSPlaceholder,
    defaultWidth: 900,
    defaultHeight: 600,
    minWidth: 600,
    minHeight: 400,
    category: "core",
  },
  {
    id: "finance",
    title: "Finance",
    icon: "TrendingUp",
    color: "#059669",
    component: FinancePlaceholder,
    defaultWidth: 850,
    defaultHeight: 550,
    category: "business",
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: "Package",
    color: "#D97706",
    component: InventoryPlaceholder,
    defaultWidth: 850,
    defaultHeight: 550,
    category: "business",
  },
  {
    id: "crm",
    title: "CRM",
    icon: "Users",
    color: "#7C3AED",
    component: CRMPlaceholder,
    defaultWidth: 800,
    defaultHeight: 500,
    category: "business",
  },
  {
    id: "hr",
    title: "HR",
    icon: "UserCog",
    color: "#DC2626",
    component: HRPlaceholder,
    defaultWidth: 800,
    defaultHeight: 500,
    category: "business",
  },
  {
    id: "ai-chat",
    title: "AI Chat",
    icon: "Sparkles",
    color: "#0EA5E9",
    component: AIChatPlaceholder,
    defaultWidth: 480,
    defaultHeight: 600,
    minWidth: 360,
    minHeight: 400,
    allowMultiple: false,
    category: "core",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    icon: "Store",
    color: "#EA580C",
    component: MarketplacePlaceholder,
    defaultWidth: 850,
    defaultHeight: 550,
    category: "system",
  },
  {
    id: "settings",
    title: "Settings",
    icon: "Settings",
    color: "#64748B",
    component: SettingsPlaceholder,
    defaultWidth: 700,
    defaultHeight: 480,
    allowMultiple: false,
    category: "system",
  },
];

export function getAppById(id: string): AppDefinition | undefined {
  return appRegistry.find((app) => app.id === id);
}

export function getDockApps(): AppDefinition[] {
  return appRegistry.filter((app) =>
    ["pos", "finance", "inventory", "crm", "hr", "ai-chat", "marketplace", "settings"].includes(app.id)
  );
}
