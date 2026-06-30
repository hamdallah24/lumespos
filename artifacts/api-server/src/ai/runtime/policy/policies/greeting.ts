import { RuntimePolicy, RuntimePolicyProvider } from "../types";

export const GreetingPolicyProvider: RuntimePolicyProvider = {
  name: "GreetingPolicy",
  canHandle: (category: string) => category === "greeting" || category === "approval",
  buildPolicy: (): RuntimePolicy => ({
    approval: false,
    tools: "none",
    classification: "public",
    knowledge: "none",
    history: "last2",
    foundation: "none",
    manifest: false,
    sharedContext: false,
    maxTokens: 500,
  }),
};
