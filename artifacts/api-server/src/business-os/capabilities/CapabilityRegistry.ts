import type { BusinessCapability, CapabilityDomain } from "./types";
import { INVENTORY_CAPABILITY } from "./inventory/InventoryCapability";
import { SALES_CAPABILITY } from "./sales/SalesCapability";
import { FINANCE_CAPABILITY } from "./finance/FinanceCapability";
import { HR_CAPABILITY } from "./hr/HRCapability";
import { PRODUCTION_CAPABILITY } from "./production/ProductionCapability";
import { PURCHASING_CAPABILITY } from "./purchasing/PurchasingCapability";
import { WAREHOUSE_CAPABILITY } from "./warehouse/WarehouseCapability";
import { CRM_CAPABILITY } from "./crm/CRMCapability";
import { MARKETING_CAPABILITY } from "./marketing/MarketingCapability";
import { EXPANSION_CAPABILITY } from "./expansion/ExpansionCapability";
import { PLATFORM_CAPABILITY } from "./platform/PlatformCapability";

const ALL_CAPABILITIES: BusinessCapability[] = [
  INVENTORY_CAPABILITY,
  SALES_CAPABILITY,
  FINANCE_CAPABILITY,
  HR_CAPABILITY,
  PRODUCTION_CAPABILITY,
  PURCHASING_CAPABILITY,
  WAREHOUSE_CAPABILITY,
  CRM_CAPABILITY,
  MARKETING_CAPABILITY,
  EXPANSION_CAPABILITY,
  PLATFORM_CAPABILITY,
];

const capabilityMap = new Map<string, BusinessCapability>();
const domainMap = new Map<CapabilityDomain, BusinessCapability[]>();
const actionMap = new Map<string, { capability: BusinessCapability; action: BusinessCapability["supportedActions"][0] }[]>();
const executiveMap = new Map<string, BusinessCapability[]>();

function buildIndex(): void {
  capabilityMap.clear();
  domainMap.clear();
  actionMap.clear();
  executiveMap.clear();

  for (const cap of ALL_CAPABILITIES) {
    capabilityMap.set(cap.id, cap);

    const domainList = domainMap.get(cap.domain) || [];
    domainList.push(cap);
    domainMap.set(cap.domain, domainList);

    const execList = executiveMap.get(cap.ownerExecutive) || [];
    execList.push(cap);
    executiveMap.set(cap.ownerExecutive, execList);

    for (const action of cap.supportedActions) {
      const actions = actionMap.get(action.name.toLowerCase()) || [];
      actions.push({ capability: cap, action });
      actionMap.set(action.name.toLowerCase(), actions);
    }
  }
}

buildIndex();

export function getAllCapabilities(): BusinessCapability[] {
  return [...ALL_CAPABILITIES];
}

export function getCapabilityById(id: string): BusinessCapability | undefined {
  return capabilityMap.get(id);
}

export function getCapabilitiesByDomain(domain: CapabilityDomain): BusinessCapability[] {
  return domainMap.get(domain) || [];
}

export function getCapabilitiesByExecutive(executive: string): BusinessCapability[] {
  return executiveMap.get(executive) || [];
}

export function getCapabilityByAction(actionName: string): { capability: BusinessCapability; action: BusinessCapability["supportedActions"][0] } | undefined {
  const results = actionMap.get(actionName.toLowerCase());
  return results?.[0];
}

export function getAllActionsByActionName(actionName: string): { capability: BusinessCapability; action: BusinessCapability["supportedActions"][0] }[] {
  return actionMap.get(actionName.toLowerCase()) || [];
}

export function hasCapability(id: string): boolean {
  return capabilityMap.has(id);
}

export function count(): number {
  return ALL_CAPABILITIES.length;
}

export function reload(): void {
  buildIndex();
}
