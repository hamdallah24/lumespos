import { RuntimePolicy, RuntimePolicyProvider } from "../types";

export const KnowledgePolicyProvider: RuntimePolicyProvider = {
  name: "KnowledgePolicy",
  canHandle: (category: string) => category === "knowledge_query",
  buildPolicy: (): RuntimePolicy => ({
    approval: false,
    tools: "none",
    classification: "public",
    knowledge: "minimal",
    history: "last5",
    foundation: "basic",
    manifest: false,
    sharedContext: true,
    maxTokens: 2000,
  }),
};
