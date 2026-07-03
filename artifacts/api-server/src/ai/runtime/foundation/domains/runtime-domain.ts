// ECP-023: Runtime Domain — per-runtime directives (CEO, CTO, COO)
// ECP-025: Typed. Reads from Foundation documents.

import type { IRuntimeDomain } from "../types/provider-interfaces";
import { getAssetContent, getAsset } from "../foundation-cache";

const ROLE_DIRECTIVE_MAP: Record<string, string> = {
  CEO: "ceo-directive-v1",
  CTO: "cto-directive-v1",
  COO: "coo-directive-v1",
};

class RuntimeDomain implements IRuntimeDomain {
  private _authorize(role: string, docId: string): boolean {
    const doc = getAsset(docId);
    if (!doc) return false;
    const consumers = doc.authorized_consumers;
    if (consumers.length === 0) return true;
    return consumers.includes(role) || consumers.includes("All Runtimes");
  }

  directive(role: string): { directive: string; authority: string; forbiddenActions: string[]; requiredBehaviors: string[]; delegates: Record<string, string> } | null {
    const docId = ROLE_DIRECTIVE_MAP[role.toUpperCase()];
    if (!docId) return null;
    if (!this._authorize(role, docId)) return null;

    const content = getAssetContent(docId);
    if (!content) return null;

    return {
      directive: content,
      authority: this.authority(role) || "limited",
      forbiddenActions: this.forbiddenActions(role),
      requiredBehaviors: this.requiredBehaviors(role),
      delegates: this.delegates(role),
    };
  }

  authority(role: string): string | null {
    const r = role.toUpperCase();
    if (r === "CEO") return "full";
    if (r === "CTO") return "limited";
    if (r === "COO") return "limited";
    return null;
  }

  forbiddenActions(role: string): string[] {
    const r = role.toUpperCase();
    if (r === "CEO") return ["execute_tools", "code_modification", "deployment", "foundation_modification"];
    if (r === "CTO") return ["foundation_modification", "override_ceo"];
    if (r === "COO") return ["engineering_decisions", "code_modification", "deployment", "foundation_modification"];
    return [];
  }

  requiredBehaviors(role: string): string[] {
    const r = role.toUpperCase();
    if (r === "CEO") return ["delegate_to_cto_coo", "report_to_founder", "never_execute_tools"];
    if (r === "CTO") return ["governed_pipeline", "identity_enforcement", "tool_governance"];
    if (r === "COO") return ["business_planner_first", "llm_fallback_only", "never_engineer"];
    return [];
  }

  delegates(role: string): Record<string, string> {
    const r = role.toUpperCase();
    if (r === "CEO") return { CTO: "technical", COO: "business", CFO: "finance" };
    if (r === "CTO") return { QA: "testing", DevOps: "deployment", Research: "analysis" };
    if (r === "COO") return { Inventory: "inventory", Sales: "sales" };
    return {};
  }
}

export const runtimeDomain = new RuntimeDomain();
