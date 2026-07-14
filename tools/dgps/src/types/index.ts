// ── Source Document (scanned from docs/) ──
export interface DocumentSource {
  path: string;
  id: string;
  title: string;
  owner: string;
  consumer: string[];
  version: string;
  checksum: string;
  status: string;
  dependencies: string[];
  inherits: string[];
  category: string;
  content: string;
  metadata: Record<string, unknown>;
}

// ── Edge types for dependency graph ──
export type EdgeType =
  | "inherits"
  | "references"
  | "depends_on"
  | "implements"
  | "generated_from"
  | "compiled_from"
  | "consumes";

export interface GraphEdge {
  from: string;
  to: string;
  type: EdgeType;
}

export interface DependencyGraph {
  nodes: Record<string, { depends_on: string[]; inherits: string[]; consumers: string[] }>;
  edges: GraphEdge[];
}

// ── Compiled JSON asset (generated/) ──
export type AssetType = "directive" | "foundation" | "knowledge" | "prompt" | "adr" | "manifest";

export interface CompiledAsset {
  asset_type: AssetType;
  id: string;
  canonical: boolean;
  metadata: AssetMetadata;
  structure: Record<string, unknown>;
  traceability: {
    compiled_by: string;
    compiler_version: string;
  };
}

export interface AssetMetadata {
  title: string;
  version: string;
  owner: string;
  consumer: string[];
  checksum: string;
  compiled_at: string;
  source_hash: string;
  source_paths: string[];
  dependencies: string[];
  inherits: string[];
  knowledge_level: string;
  status: string;
}

// ── Registry entry (portable index) ──
export interface RegistryEntry {
  artifact: string;
  version: string;
  checksum: string;
  consumer: string[];
  owner: string;
}

export interface Registry {
  assets: Record<string, RegistryEntry>;
}

// ── Manifest ──
export interface Manifest {
  build_id: string;
  eios_version: string;
  compiler_version: string;
  schema_version: string;
  git_commit: string;
  generated_at: string;
  build_number: number;
  registry_hash: string;
  runtime_hash: string;
  total_assets: number;
  checksums: Record<string, string>;
  registry_version: string;
}

// ── DGPS Lock ──
export interface DgpsLock {
  compiler_version: string;
  schema_version: string;
  asset_count: number;
  manifest_checksum: string;
  generated_at: string;
}

// ── Validation ──
export interface ValidationIssue {
  severity: "ERROR" | "WARNING" | "INFO";
  message: string;
  file?: string;
  line?: number;
  rule?: string;
}

export interface ValidationReport {
  passed: boolean;
  issues: ValidationIssue[];
  total_files: number;
  valid_files: number;
  skipped_files: number;
}

// ── Doctor Report ──
export interface DoctorReport {
  duplicate_ids: string[];
  broken_links: string[];
  dead_documents: string[];
  unused_assets: string[];
  circular_dependencies: string[][];
  shadowed_assets: string[];
  duplicate_canonical_sources: string[];
  runtime_consumers: Record<string, string>;
  coverage: {
    foundation: number;
    knowledge: number;
    prompt: number;
    directive: number;
    adr: number;
  };
  health_score: number;
}

// ── Document categories ──
export type DocumentCategory =
  | "executive-spec"
  | "executive-playbook"
  | "executive-prompt"
  | "constitution"
  | "foundation"
  | "knowledge"
  | "cognition"
  | "prompt-framework"
  | "adr"
  | "guide"
  | "epic"
  | "archive"
  | "unknown";
