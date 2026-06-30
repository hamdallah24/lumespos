// SPRINT 9.2: Policy Registry — finds the right policy provider for any intent
import { RuntimePolicy, RuntimePolicyProvider } from "./types";
import { GreetingPolicyProvider } from "./policies/greeting";
import { KnowledgePolicyProvider } from "./policies/knowledge";
import { AnalysisPolicyProvider } from "./policies/analysis";
import { DevOpsPolicyProvider } from "./policies/devops";
import { BusinessPolicyProvider } from "./policies/business";

const providers: RuntimePolicyProvider[] = [
  GreetingPolicyProvider,
  KnowledgePolicyProvider,
  AnalysisPolicyProvider,
  DevOpsPolicyProvider,
  BusinessPolicyProvider,
];

// Fallback policy — conservative (read-only, limited context)
const FALLBACK_POLICY: RuntimePolicy = {
  approval: false,
  tools: "read_only",
  classification: "internal",
  knowledge: "minimal",
  history: "last5",
  foundation: "basic",
  manifest: false,
  sharedContext: false,
  maxTokens: 2000,
};

export const PolicyRegistry = {
  /** Get the policy for a given intent category */
  get(category: string): RuntimePolicy {
    for (const provider of providers) {
      if (provider.canHandle(category)) {
        return provider.buildPolicy();
      }
    }
    return { ...FALLBACK_POLICY };
  },

  /** Check if a category has a provider registered */
  has(category: string): boolean {
    return providers.some(p => p.canHandle(category));
  },

  /** Register a new provider dynamically */
  register(provider: RuntimePolicyProvider): void {
    if (providers.some(p => p.name === provider.name)) {
      console.warn(`[PolicyRegistry] Provider "${provider.name}" already registered — overwriting`);
    }
    providers.push(provider);
  },

  /** List all registered providers */
  list(): string[] {
    return providers.map(p => p.name);
  },
};

// Component metadata
export const policyRegistry = {
  name: "PolicyRegistry",
  version: "1.0.0",
  capabilities: ["policy-resolution", "provider-registration", "dynamic-rules"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
