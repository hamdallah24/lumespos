// ECP-029: Knowledge Types — all data structures for Knowledge Office
// Frozen. Ingestible artifacts, patterns, summaries, indices.

export interface KnowledgeArtifact {
  id: string;
  type: "mission_report" | "adr" | "lesson" | "pattern" | "insight" | "kpi" | "failure";
  source: string;           // Which mission/generator produced this
  content: string;
  timestamp: string;
  tags: string[];
  confidence: number;       // 0-100
  relatedTo: string[];      // IDs of related artifacts
}

export interface DetectedPattern {
  id: string;
  type: "recurring_bug" | "architecture_drift" | "policy_conflict" | "duplicate" | "skill_gap" | "performance_decline";
  description: string;
  evidenceIds: string[];    // KnowledgeArtifact IDs that support this pattern
  severity: "low" | "medium" | "high" | "critical";
  firstDetected: string;
  lastDetected: string;
  occurrenceCount: number;
}

export interface ArchitectureDrift {
  domain: string;           // "Foundation", "Runtime", "Execution"
  expected: string;         // What Foundation specifies
  actual: string;           // What implementation does
  driftLevel: "none" | "minor" | "significant" | "critical";
  detectedAt: string;
  evidenceId: string;
}

export interface PolicyConflict {
  policy1: string;          // First conflicting document ID
  policy2: string;          // Second conflicting document ID
  conflict: string;         // Description of the conflict
  resolution: string;       // Suggested resolution
  severity: "low" | "medium" | "high";
}

export interface KnowledgeSummary {
  generatedAt: string;
  artifactCount: number;
  newPatterns: DetectedPattern[];
  activeDrifts: ArchitectureDrift[];
  policyConflicts: PolicyConflict[];
  keyInsights: string[];       // Top 5 insights
  failureTrend: "improving" | "stable" | "declining";
  recommendations: string[];
  compressionRatio: number;    // How much was the raw data compressed
}

export interface ContextIndex {
  generatedAt: string;
  topIssues: string[];         // Most critical issues to know right now
  recentLearnings: string[];   // What was learned recently
  activeRisks: string[];       // Current risks
  knowledgeGaps: string[];     // What we don't know
  recommendedContext: string[]; // What Consultant should read first
  totalTokenEstimate: number;   // How many tokens this index costs
}

export interface KnowledgeKPI {
  architectureDriftDetection: number;  // 0-100
  duplicatePolicyRate: number;         // 0-100 (lower is better)
  compressionRatio: number;            // >20:1 target
  governanceCompliance: number;        // 0-100
  patternCoverage: number;             // 0-100
  avgTimeToDetect: number;             // milliseconds
}
