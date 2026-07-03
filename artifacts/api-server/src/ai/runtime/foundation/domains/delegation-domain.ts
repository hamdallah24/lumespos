// ECP-023: Delegation Domain — routing, hierarchy, fallback
// Frozen. Delegation matrix from organization-engine.ts.

import type { IDelegationDomain } from "../types/provider-interfaces";
import type { DelegationMatrix } from "../types/foundation-types";

const ROUTING_MATRIX: DelegationMatrix = {
  routes: [
    { domain: "code|bug|deploy|ssh|architecture|refactor|server|vps", runtime: "CTO", runtimeId: "RUNTIME-002" },
    { domain: "inventory|sales|ops|warehouse", runtime: "COO", runtimeId: "RUNTIME-003" },
    { domain: "budget|accounting|audit|finance", runtime: "CFO", runtimeId: "RUNTIME-004" },
    { domain: "test|verify|qa|quality", runtime: "QA", runtimeId: "RUNTIME-005" },
    { domain: "deploy|ci|pipeline", runtime: "DevOps", runtimeId: "RUNTIME-006" },
    { domain: "research|investigation|analysis|study", runtime: "Research", runtimeId: "RUNTIME-007" },
  ],
  fallback: "CTO",
  fallbackId: "RUNTIME-002",
};

class DelegationDomain implements IDelegationDomain {
  getHierarchy(): string {
    return "Founder → CEO → CTO/COO/CFO → QA/DevOps/Research";
  }

  getFallback(): { runtime: string; runtimeId: string } {
    return { runtime: ROUTING_MATRIX.fallback, runtimeId: ROUTING_MATRIX.fallbackId };
  }

  getRoutingMatrix(): DelegationMatrix {
    return ROUTING_MATRIX;
  }

  canDelegate(_from: string, _to: string): boolean {
    return true; // All delegations allowed by default
  }
}

export const delegationDomain = new DelegationDomain();
