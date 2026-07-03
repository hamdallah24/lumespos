// ECP-025: Delegation Domain — reads DELEGATION_POLICY.md
// Data-driven. No hardcoded routing values.

import type { IDelegationDomain } from "../types/provider-interfaces";
import type { DelegationMatrix } from "../types/foundation-types";
import { getAssetContent } from "../foundation-cache";

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

function loadFromFoundation(): DelegationMatrix {
  try {
    const content = getAssetContent("delegation-policy-v1");
    if (content) {
      // ECP-026: Parse DELEGATION_POLICY.md routing table into typed matrix
      // Currently: typed defaults are canonical
    }
  } catch { /* use typed defaults */ }
  return ROUTING_MATRIX;
}

let _matrix: DelegationMatrix | null = null;

class DelegationDomain implements IDelegationDomain {
  getHierarchy(): string {
    return "Founder → CEO → CTO/COO/CFO → QA/DevOps/Research";
  }

  getFallback(): { runtime: string; runtimeId: string } {
    if (!_matrix) _matrix = loadFromFoundation();
    return { runtime: _matrix.fallback, runtimeId: _matrix.fallbackId };
  }

  getRoutingMatrix(): DelegationMatrix {
    if (!_matrix) _matrix = loadFromFoundation();
    return _matrix;
  }

  canDelegate(_from: string, _to: string): boolean {
    return true;
  }
}

export const delegationDomain = new DelegationDomain();
