import type { BusinessScenario } from "../types";
import { inventoryScenarios } from "./inventory-scenarios";
import { salesScenarios } from "./sales-scenarios";
import { financeScenarios } from "./finance-scenarios";
import { hrScenarios } from "./hr-scenarios";
import { productionScenarios } from "./production-scenarios";
import { purchasingScenarios } from "./purchasing-scenarios";
import { warehouseScenarios } from "./warehouse-scenarios";
import { crmScenarios } from "./crm-scenarios";
import { marketingScenarios } from "./marketing-scenarios";
import { expansionScenarios } from "./expansion-scenarios";
import { platformScenarios } from "./platform-scenarios";
import { councilScenarios } from "./council-scenarios";
import { crossDomainScenarios } from "./cross-domain-scenarios";

export const ALL_SCENARIOS: BusinessScenario[] = [
  ...inventoryScenarios,
  ...salesScenarios,
  ...financeScenarios,
  ...hrScenarios,
  ...productionScenarios,
  ...purchasingScenarios,
  ...warehouseScenarios,
  ...crmScenarios,
  ...marketingScenarios,
  ...expansionScenarios,
  ...platformScenarios,
  ...councilScenarios,
  ...crossDomainScenarios,
];

export function getScenariosByDomain(domain: string): BusinessScenario[] {
  return ALL_SCENARIOS.filter(s => s.domain === domain || s.tags.includes(domain));
}

export function getScenarioById(id: string): BusinessScenario | undefined {
  return ALL_SCENARIOS.find(s => s.id === id);
}

export function getScenariosByPriority(priority: string): BusinessScenario[] {
  return ALL_SCENARIOS.filter(s => s.priority === priority);
}

export { inventoryScenarios, salesScenarios, financeScenarios, hrScenarios, productionScenarios, purchasingScenarios, warehouseScenarios, crmScenarios, marketingScenarios, expansionScenarios, platformScenarios, councilScenarios, crossDomainScenarios };
