import { RuntimePolicy, RuntimePolicyProvider } from "../types";

export const BusinessPolicyProvider: RuntimePolicyProvider = {
  name: "BusinessPolicy",
  canHandle: (category: string) => category === "business_action",
  buildPolicy: (): RuntimePolicy => ({
    approval: false,
    tools: "business",
    classification: "internal",
    knowledge: "minimal",
    history: "full",
    foundation: "basic",
    manifest: false,
    sharedContext: true,
    maxTokens: 2000,
  }),
};
