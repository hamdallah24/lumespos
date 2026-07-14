import { buildStrategy } from "../core";
import type { DecisionContext } from "../../decision-context/types";
import type { OperationalSituation } from "../../operational-decision-engine/core/types";
import type { StrategicObjective, StrategicDirection } from "../core/types";

const strategyStore: StrategicObjective[] = [];
const MAX_STORE_SIZE = 100;

export const StrategyProvider = {
  createFromSituation(
    situation: OperationalSituation,
    context?: DecisionContext,
  ): StrategicObjective {
    const strategy = buildStrategy(situation, context);
    strategyStore.unshift(strategy);
    if (strategyStore.length > MAX_STORE_SIZE) strategyStore.length = MAX_STORE_SIZE;
    return strategy;
  },

  getAll(): StrategicObjective[] {
    return [...strategyStore];
  },

  getById(id: string): StrategicObjective | undefined {
    return strategyStore.find(s => s.id === id);
  },

  getByDomain(domain: string): StrategicObjective[] {
    return strategyStore.filter(s => s.domain === domain);
  },

  getByDirection(direction: StrategicDirection): StrategicObjective[] {
    return strategyStore.filter(s => s.direction === direction);
  },

  getActive(): StrategicObjective[] {
    return strategyStore.filter(s => s.status === "active");
  },

  updateStatus(id: string, status: StrategicObjective["status"]): boolean {
    const s = strategyStore.find(s => s.id === id);
    if (!s) return false;
    s.status = status;
    return true;
  },

  clear(): void {
    strategyStore.length = 0;
  },
};
