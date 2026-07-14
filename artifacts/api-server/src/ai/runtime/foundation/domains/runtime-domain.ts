// ECP-023: Runtime Domain — per-runtime directives (CEO, CTO, COO)
// ECP-025: Typed. Reads from Foundation documents.

import type { IRuntimeDomain } from "../types/provider-interfaces";
import { getAssetContent, getAsset } from "../foundation-cache";

const ROLE_DIRECTIVE_MAP: Record<string, string> = {
  CEO: "ceo-directive",
  CTO: "cto-directive",
  COO: "coo-directive",
  CFO: "cfo-directive",
  CMO: "cmo-directive",
  CAIO: "caio-directive",
  CKO: "cko-directive",
  CHRO: "chro-directive",
};

class RuntimeDomain implements IRuntimeDomain {
  private _authorize(role: string, docId: string): boolean {
    const doc = getAsset(docId);
    if (!doc) return false;
    const consumers = doc.authorized_consumers;
    if (consumers.length === 0) return true;
    const roleLower = role.toLowerCase();
    return consumers.some(c =>
      c === role ||
      c.toLowerCase() === roleLower ||
      c === "All Runtimes" ||
      c.toLowerCase() === roleLower + "-runtime"
    );
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
    if (r === "CFO") return "limited";
    if (r === "CMO") return "limited";
    if (r === "CAIO") return "limited";
    if (r === "CKO") return "limited";
    return null;
  }

  forbiddenActions(role: string): string[] {
    const r = role.toUpperCase();
    if (r === "CEO") return ["execute_tools", "code_modification", "deployment", "foundation_modification"];
    if (r === "CTO") return ["foundation_modification", "override_ceo"];
    if (r === "COO") return ["engineering_decisions", "code_modification", "deployment", "foundation_modification"];
    if (r === "CFO") return ["engineering_decisions", "code_modification", "deployment", "foundation_modification", "tool_execution"];
    if (r === "CMO") return ["engineering_decisions", "code_modification", "deployment", "foundation_modification"];
    if (r === "CAIO") return ["business_decisions", "code_modification", "financial_operations"];
    if (r === "CKO") return ["business_decisions", "code_modification", "financial_operations"];
    return [];
  }

  requiredBehaviors(role: string): string[] {
    const r = role.toUpperCase();
    if (r === "CEO") return ["delegate_to_cto_coo", "report_to_founder", "never_execute_tools"];
    if (r === "CTO") return ["governed_pipeline", "identity_enforcement", "tool_governance"];
    if (r === "COO") return ["business_planner_first", "llm_fallback_only", "never_engineer"];
    if (r === "CFO") return ["financial_analysis_first", "llm_only", "never_engineer"];
    if (r === "CMO") return ["data_driven_marketing", "customer_first", "campaign_tracking"];
    if (r === "CAIO") return ["monitor_ai_health", "knowledge_driven", "automation_first"];
    if (r === "CKO") return ["knowledge_quality_first", "curator_mindset", "evidence_based"];
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
