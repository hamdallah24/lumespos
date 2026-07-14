export interface HealthRecord {
  timestamp: string;
  overall: number;
  registries: number;
  plugins: number;
  pipeline: number;
  memory: number;
  eventBus: number;
  dependencies: number;
  governance: number;
  scheduler: number;
}

export interface HealthScore {
  overall: number;
  registries: number;
  plugins: number;
  pipeline: number;
  memory: number;
  scheduler: number;
}

export interface DependencyHealth {
  redis: { status: string; latencyMs: number };
  database: { status: string; latencyMs: number };
  llm: { status: string; model: string };
  embedding: { status: string; enabled: boolean };
  knowledge: { status: string; totalBlocks: number };
}
