import { RuntimePolicy, RuntimePolicyProvider } from "../types";

export const AnalysisPolicyProvider: RuntimePolicyProvider = {
  name: "AnalysisPolicy",
  canHandle: (category: string) => category === "analyze_code" || category === "implement_change",
  buildPolicy: (): RuntimePolicy => ({
    approval: false,
    tools: "read_only",
    classification: "internal",
    knowledge: "full",
    history: "full",
    foundation: "full",
    manifest: true,
    sharedContext: true,
    maxTokens: 6000,
  }),
};
