// ============================================================
// RIC — Runtime Intelligence Core
// Phase 1: Foundation — Shared Types & Interfaces
// ============================================================

// ===== Entity Types =====

export interface Entity {
  type: 'branch' | 'product' | 'employee' | 'date' | 'amount'
      | 'project' | 'outlet' | 'menu' | 'recipe' | 'organization'
      | 'executive' | 'workflow' | 'repository' | 'component'
      | 'person' | 'location' | 'identifier';
  name: string;
  value?: string;
  confidence: number;
}

// ===== Risk Assessment =====

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  requiresApproval: boolean;
}

// ===== Understanding Result (Cognitive Block 1) =====

export interface UnderstandingResult {
  goal: string;
  intent: string;
  subIntent: string;
  domain: {
    primary: string;
    secondary: string[];
  };
  entities: Entity[];
  reasoning: {
    intentRationale: string;
    domainRationale: string;
    entityRationale: string;
    alternativesConsidered: string[];
  };
  thinkingMode: 'fast' | 'balanced' | 'deep';
  urgency: 'low' | 'medium' | 'high';
  risk: RiskAssessment;
  confidence: number;
  needClarification: boolean;
  clarificationQuestion?: string;
}

// ===== Retrieval Plan v3 (Capability-based Execution Contract) =====

export type FailurePolicy = 'ignore' | 'retry' | 'degrade' | 'abort';
export type CachePolicy = 'allow' | 'refresh' | 'bypass';
export type GroundingProviderName = 'operational' | 'memory' | 'knowledge' | 'metadata' | 'repository';

export type CapabilityName =
  | 'SOURCE_CODE' | 'FINANCIAL_DATA' | 'INVENTORY_STATE' | 'SALES_DATA'
  | 'SYSTEM_STATE' | 'BUSINESS_METRICS' | 'CUSTOMER_INSIGHT' | 'MARKET_ANALYSIS'
  | 'POLICY_KNOWLEDGE' | 'PROCEDURAL_KNOWLEDGE' | 'DECISION_MEMORY' | 'CONVERSATION_MEMORY'
  | 'MISSION_CONTEXT' | 'KNOWLEDGE_BLOCK' | 'EXECUTIVE_CAPABILITY' | 'TOOL_AVAILABILITY'
  | 'EVENT_HISTORY' | 'WORKFLOW_STATE' | 'REPOSITORY_SOURCE' | 'REPOSITORY_CONFIG'
  | 'REPOSITORY_DOCS';

export interface EstimatedCost {
  latency: number;
  tokens: number;
  apiCalls: number;
}

export interface CapabilityConstraint {
  minVersion?: string;
  maxCost?: number;
  maxLatency?: number;
  preferredProvider?: string;
}

export interface RetrievalTaskLimits {
  maxSize?: string;
  retries?: number;
  maxTokens?: number;
}

export interface RetrievalTask {
  id: string;
  requiredCapability: CapabilityName;
  fallbackCapabilities?: CapabilityName[];
  capabilityConstraint?: CapabilityConstraint;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dependency: string[];
  reason: string;
  request: unknown;
  timeout: number;
  estimatedLatency: number;
  estimatedCost: EstimatedCost;
  cachePolicy: CachePolicy;
  failurePolicy: FailurePolicy;
  required: boolean;
  limits?: RetrievalTaskLimits;
}

export interface RetrievalPlan {
  tasks: RetrievalTask[];
  executionGraph: ExecutionGraph;
  toolNeeds: ToolRequest[];
}

// Internal types — used by Grounding providers and Verification rules
export interface RetrievalRequest {
  type: 'knowledge' | 'metadata' | 'operational';
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  groundingPriority: 'critical' | 'high' | 'medium' | 'low';
  timing: 'immediate' | 'deferred' | 'on_demand';
  detail: 'summarized' | 'detailed' | 'exhaustive';
  filters?: Record<string, string>;
  maxResults?: number;
}

export interface RepositoryRequest {
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  groundingPriority: 'critical' | 'high' | 'medium' | 'low';
  timing: 'immediate' | 'deferred' | 'on_demand';
  detail: 'summarized' | 'detailed' | 'exhaustive';
  suggestedPaths?: string[];
  suggestedTags?: string[];
  maxFiles?: number;
}

export interface MetadataRequest {
  nodeType: string;
  filters?: Record<string, string>;
  properties?: string[];
}

export interface MemoryRequest {
  type: 'working' | 'decision' | 'knowledge' | 'episodic' | 'mission' | 'conversation';
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  maxResults?: number;
}

export interface OperationalRequest {
  dataType: string;
  description: string;
  priority: 'required' | 'optional' | 'fallback';
  parameters?: Record<string, string>;
}

export interface ToolRequest {
  capability: string;
  description: string;
  priority: 'required' | 'optional' | 'fallback';
}

export interface ExecutionGraph {
  steps: ExecutionStep[];
  parallel: string[][];
  estimatedCost: 'low' | 'medium' | 'high';
  estimatedDuration: string;
  riskNotes: string[];
}

export interface ExecutionStep {
  id: string;
  type: 'retrieve' | 'analyze' | 'transform' | 'execute' | 'decide' | 'present';
  description: string;
  dependsOn: string[];
  assignedTool?: string;
}

// ===== Grounding =====

export type VerificationState = 'verified' | 'partially_verified' | 'unverified' | 'contradicted';

export interface GroundingProvider<TNeed, TResult> {
  read(needs: TNeed[]): Promise<TResult[]>;
  health(): Promise<HealthStatus>;
}

export interface HealthStatus {
  ok: boolean;
  latency: number;
}

export interface GroundingResult {
  operationalData: OperationalData[];
  memoryEntries: MemoryEntry[];
  knowledgeBlocks: KnowledgeBlock[];
  metadataNodes: MetadataNode[];
  fileContents: FileContent[];
  errors: GroundingError[];
  executionTimeMs: number;
}

export interface OperationalData {
  type: string;
  data: unknown;
  source: string;
  timestamp: number;
}

export interface MemoryEntry {
  id: string;
  type: string;
  content: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
}

export interface KnowledgeBlock {
  id: string;
  content: string;
  source: string;
  confidence: number;
}

export interface MetadataNode {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  relationships: string[];
}

export interface FileContent {
  path: string;
  content: string;
  size: number;
}

export interface GroundingError {
  provider: string;
  message: string;
  timestamp: number;
}

// ===== Verification =====

export interface VerificationResult {
  state: VerificationState;
  checks: CheckResult[];
  verificationConfidence: number;
  contradictions: Contradiction[];
  warnings: VerificationWarning[];
  recovery: RecoverySuggestion[];
  confidenceAdjustment: number;
}

export interface CheckResult {
  check: string;
  state: VerificationState;
  expected: string;
  actual: string;
  confidence: number;
}

export interface Contradiction {
  reasoningOutput: string;
  evidence: string;
  severity: 'low' | 'medium' | 'high';
}

export interface VerificationWarning {
  check: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  confidenceImpact: number;
}

export interface RecoverySuggestion {
  check: string;
  action: string;
  expectedOutcome: string;
  priority: 'low' | 'medium' | 'high';
}

// ===== Confidence & Provenance =====

export interface OverallConfidence {
  reasoning: number;
  grounding: number;
  verification: number;
  overall: number;
  provenance: ConfidenceProvenance;
  weakAreas: string[];
  safeToExecute: boolean;
}

export interface ConfidenceProvenance {
  intentConfidence: number;
  entityConfidence: number;
  groundingCompleteness: number;
  verificationStatus: VerificationState;
  planningConfidence: number;
  toolResolutionConfidence: number;
}

// ===== Runtime Trace =====

export interface RuntimeTrace {
  stages: TraceStage[];
  totalDurationMs: number;
}

export interface TraceStage {
  name: 'understand' | 'reason' | 'plan' | 'ground' | 'verify' | 'assemble' | 'ground-replan' | 'verify-replan';
  durationMs: number;
  confidence: number;
  provider: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  status: 'success' | 'degraded' | 'fallback' | 'failed';
  error?: string;
}

// ===== Evidence =====

export interface Evidence {
  id: string;
  type: 'operational_truth' | 'knowledge' | 'repository' | 'metadata' | 'memory';
  source: string;
  query: string;
  result: unknown;
  rowCount?: number;
  timestamp: number;
  durationMs: number;
  confidence: number;
  error?: string;
}

// ===== Runtime Budget =====

export interface RuntimeBudget {
  limits: Record<string, number>;
  exceeded: boolean;
  exceededStages: string[];
}

// ===== Capability Graph =====

export type CapabilityHealth = 'healthy' | 'degraded' | 'offline' | 'experimental' | 'deprecated';

export interface CapabilityNode {
  name: string;
  domain: string;
  description: string;
  groundingProviders: string[];
  tools: string[];
  executives: string[];
  health: CapabilityHealth;
}

export interface CapabilityGraph {
  getCapability(name: string): CapabilityNode | null;
  findCapabilitiesByDomain(domain: string): CapabilityNode[];
  findCapabilitiesByExecutive(executive: string): CapabilityNode[];
  isCapabilitySupported(name: string): boolean;
}

// ===== Reasoning Provider (Multi-Model) =====

export interface ReasoningProvider {
  reason<T>(prompt: string, schema: unknown, options?: ReasoningOptions): Promise<ReasoningResult<T>>;
  health(): Promise<HealthStatus>;
}

export interface ReasoningOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  thinkingMode?: 'fast' | 'balanced' | 'deep';
}

export interface ReasoningResult<T> {
  data: T;
  provider: string;
  model: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  confidence: number;
}

// ===== Tool Catalog =====

export interface ToolDescriptor {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  cost: 'low' | 'medium' | 'high';
  latency: 'low' | 'medium' | 'high';
  permissions: string[];
  enabled: boolean;
}

// ===== Repository Metadata =====

export interface RepositoryMetadata {
  path: string;
  description: string;
  exports: string[];
  tags: string[];
  owner: string;
  importance: 'high' | 'medium' | 'low';
  dependencies: string[];
  lastModified: Date;
}

// ===== Executive =====

export interface ToolSuggestion {
  toolId: string;
  toolName: string;
  capability: string;
  confidence: number;
}

// ===== Refinement History (Phase 4) =====

export interface RefinementEntry {
  iteration: number;
  confidenceBefore: number;
  confidenceAfter: number;
  taskCountBefore: number;
  taskCountAfter: number;
  changedCapabilities: string[];
  failedChecks: string[];
  resolvedChecks: string[];
  triggeredBy: string;
}

// ===== Slices (RuntimeContext Building Blocks) =====

export interface ContextMetadata {
  version: string;
  contractId: string;
  createdAt: number;
  degraded: boolean;
  degradedReason?: string;
}

export interface IntelligenceSlice {
  goal: string;
  intent: string;
  subIntent: string;
  domain: {
    primary: string;
    secondary: string[];
  };
  entities: Entity[];
  reasoning: {
    intentRationale: string;
    domainRationale: string;
    entityRationale: string;
    alternativesConsidered: string[];
  };
  thinkingMode: 'fast' | 'balanced' | 'deep';
  urgency: 'low' | 'medium' | 'high';
  risk: RiskAssessment;
}

export interface PlanningSlice {
  executionPlan: ExecutionStep[];
  suggestedTools: ToolSuggestion[];
  recommendedStrategy: string;
  expectedOutput: string;
}

export interface GroundingSlice {
  operational: OperationalData[];
  memory: MemoryContext;
  knowledge: KnowledgeBlock[];
  repository: FileContent[];
  metadata: MetadataNode[];
  requiredTruth: RetrievalTask[];
  retrievedTruth: GroundingResult[];
  missingTruth: string[];
}

export interface VerificationSlice {
  results: VerificationResult;
  explainability: {
    whyDomain: string;
    whyTool: string;
    whyRepository: string;
    whyMemory: string;
    whyConfidence: string;
    whyPlanning: string;
  };
}

export interface AwarenessSlice {
  summary: string;
  overallHealth: string;
  overallConfidence: number;
  awarenessScore: number;
  nextAttention: string;
  businessSituation: {
    summary: string;
    riskLevel: string;
    trend: string;
    focus: string;
  };
  systemSituation: {
    summary: string;
    health: string;
    degradedServices: string[];
    runtimeState: string;
  };
  criticalSignalCount: number;
  warningCount: number;
}

export interface RuntimeSlice {
  trace: RuntimeTrace;
  evidence: Evidence[];
  budget: RuntimeBudget;
  confidence: OverallConfidence;
  reasoningTrace: TraceEntry[];
}

// ===== RuntimeContext (Composable Contract) =====

export interface RuntimeContext {
  metadata: ContextMetadata;
  intelligence: IntelligenceSlice;
  planning: PlanningSlice;
  grounding: GroundingSlice;
  verification: VerificationSlice;
  awareness?: AwarenessSlice;
  refinementHistory?: RefinementEntry[];
  runtime: RuntimeSlice;
  erpContexts?: Record<string, unknown>;
  operationalState?: {
    inventory?: unknown;
    finance?: unknown;
    people?: unknown;
    suppliers?: unknown;
    production?: unknown;
    sales?: unknown;
    timestamp: number;
  };
}

export interface MemoryContext {
  type: string;
  entries: MemoryEntry[];
  retrievalTime: number;
}

export interface TraceEntry {
  component: string;
  input: string;
  output: string;
  confidence: number;
  durationMs: number;
  timestamp: number;
}

// ===== Executive Runtime Contract =====

export interface ExecutiveRuntime {
  execute(context: RuntimeContext): Promise<ExecutiveResponse>;
}

export interface ExecutiveResponse {
  content: string;
  confidence: number;
  disclaimer?: string;
}

export interface ExecutiveCapability {
  supportedContractVersions: string[];
  minConfidence: number;
  requiredFields: string[];
}

// ===== Orchestrator Input =====

export interface ReasonerInput {
  message: string;
  conversationHistory?: MessageRecord[];
  availableDomains: string[];
  availableTools: ToolDescriptor[];
  availableMemoryStores: string[];
  repositoryIndex: RepositoryMetadata[];
  userRole?: string;
  tenantContext?: TenantContext;
  thinkingMode?: 'fast' | 'balanced' | 'deep';
}

export interface MessageRecord {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId?: string;
}
