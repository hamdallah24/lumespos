import type { CapabilityName, GroundingProviderName, Evidence } from '../types';

const CAPABILITY_TO_PROVIDER: Record<CapabilityName, GroundingProviderName> = {
  SOURCE_CODE: 'repository',
  REPOSITORY_SOURCE: 'repository',
  REPOSITORY_CONFIG: 'repository',
  REPOSITORY_DOCS: 'repository',
  FINANCIAL_DATA: 'operational',
  INVENTORY_STATE: 'operational',
  SALES_DATA: 'operational',
  BUSINESS_METRICS: 'operational',
  CUSTOMER_INSIGHT: 'operational',
  MARKET_ANALYSIS: 'knowledge',
  POLICY_KNOWLEDGE: 'knowledge',
  PROCEDURAL_KNOWLEDGE: 'knowledge',
  KNOWLEDGE_BLOCK: 'knowledge',
  DECISION_MEMORY: 'memory',
  CONVERSATION_MEMORY: 'memory',
  MISSION_CONTEXT: 'memory',
  EVENT_HISTORY: 'memory',
  SYSTEM_STATE: 'metadata',
  EXECUTIVE_CAPABILITY: 'metadata',
  TOOL_AVAILABILITY: 'metadata',
  WORKFLOW_STATE: 'metadata',
};

const CAPABILITY_TO_EVIDENCE_TYPE: Record<CapabilityName, Evidence['type']> = {
  SOURCE_CODE: 'repository',
  REPOSITORY_SOURCE: 'repository',
  REPOSITORY_CONFIG: 'repository',
  REPOSITORY_DOCS: 'repository',
  FINANCIAL_DATA: 'operational_truth',
  INVENTORY_STATE: 'operational_truth',
  SALES_DATA: 'operational_truth',
  BUSINESS_METRICS: 'operational_truth',
  CUSTOMER_INSIGHT: 'operational_truth',
  MARKET_ANALYSIS: 'knowledge',
  POLICY_KNOWLEDGE: 'knowledge',
  PROCEDURAL_KNOWLEDGE: 'knowledge',
  KNOWLEDGE_BLOCK: 'knowledge',
  DECISION_MEMORY: 'memory',
  CONVERSATION_MEMORY: 'memory',
  MISSION_CONTEXT: 'memory',
  EVENT_HISTORY: 'memory',
  SYSTEM_STATE: 'metadata',
  EXECUTIVE_CAPABILITY: 'metadata',
  TOOL_AVAILABILITY: 'metadata',
  WORKFLOW_STATE: 'metadata',
};

const REPOSITORY_CAPABILITIES = new Set<CapabilityName>([
  'SOURCE_CODE', 'REPOSITORY_SOURCE', 'REPOSITORY_CONFIG', 'REPOSITORY_DOCS',
]);

const MEMORY_CAPABILITIES = new Set<CapabilityName>([
  'DECISION_MEMORY', 'CONVERSATION_MEMORY', 'MISSION_CONTEXT', 'EVENT_HISTORY',
]);

const OPERATIONAL_CAPABILITIES = new Set<CapabilityName>([
  'FINANCIAL_DATA', 'INVENTORY_STATE', 'SALES_DATA', 'BUSINESS_METRICS', 'CUSTOMER_INSIGHT',
]);

export function resolveProvider(capability: CapabilityName): GroundingProviderName {
  return CAPABILITY_TO_PROVIDER[capability];
}

export function resolveEvidenceType(capability: CapabilityName): Evidence['type'] {
  return CAPABILITY_TO_EVIDENCE_TYPE[capability];
}

export function isRepositoryCapability(capability: CapabilityName): boolean {
  return REPOSITORY_CAPABILITIES.has(capability);
}

export function isMemoryCapability(capability: CapabilityName): boolean {
  return MEMORY_CAPABILITIES.has(capability);
}

export function isOperationalCapability(capability: CapabilityName): boolean {
  return OPERATIONAL_CAPABILITIES.has(capability);
}

export function getCapabilitiesByProvider(provider: GroundingProviderName): CapabilityName[] {
  return (Object.entries(CAPABILITY_TO_PROVIDER) as [CapabilityName, GroundingProviderName][])
    .filter(([, p]) => p === provider)
    .map(([c]) => c);
}
