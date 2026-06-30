// SPRINT 9.2: Runtime Policy types
// Policy = what is allowed. Strategy = how to execute.

export interface RuntimePolicy {
  // ── Policy (rules) ──
  approval: boolean;           // Founder approval required?
  tools: "none" | "read_only" | "devops" | "business";
  classification: "public" | "internal" | "confidential";

  // ── Strategy (execution) ──
  knowledge: "none" | "minimal" | "conditional" | "full";
  history: "none" | "last2" | "last5" | "full";
  foundation: "none" | "basic" | "full";
  manifest: boolean;           // Include manifest file fetching?
  sharedContext: boolean;      // Include shared agent context?
  maxTokens: number;           // Context token budget
}

export interface IntentResult {
  category: string;
  confidence: number;
  complexity: "simple" | "medium" | "complex";
  requiresTools: boolean;
  suggestedToolSet: "READ_TOOLS" | "DEVOPS_TOOLS" | "NONE" | "BUSINESS";
  needsApproval: boolean;
  mode: "cto" | "bisnis" | "chat";
  extracted: { filePaths: string[]; keywords: string[]; actions: string[] };
  reason: string;
  runtimePolicy: RuntimePolicy;
}

export interface RuntimePolicyProvider {
  name: string;
  canHandle(category: string): boolean;
  buildPolicy(ctx?: any): RuntimePolicy;
}
