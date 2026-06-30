import { RuntimePolicy, RuntimePolicyProvider } from "../types";

export const DevOpsPolicyProvider: RuntimePolicyProvider = {
  name: "DevOpsPolicy",
  canHandle: (category: string) => category === "devops_operation",
  buildPolicy: (): RuntimePolicy => ({
    approval: true,           // DevOps always needs approval
    tools: "devops",
    classification: "confidential",
    knowledge: "full",
    history: "last5",
    foundation: "full",
    manifest: true,
    sharedContext: true,
    maxTokens: 6000,
  }),
};
