import type { DecisionContext } from "./types";
import { buildDecisionContext } from "./DecisionContextBuilder";

let lastContext: DecisionContext | null = null;

export const ContextProvider = {
  generate(): DecisionContext {
    lastContext = buildDecisionContext();
    return lastContext;
  },

  getLast(): DecisionContext | null {
    return lastContext;
  },

  generateForSituation(situationDomain: string): DecisionContext {
    const ctx = buildDecisionContext();
    ctx.id = `ctx-${situationDomain}-${Date.now()}`;
    lastContext = ctx;
    return ctx;
  },
};
