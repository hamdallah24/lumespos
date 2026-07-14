export interface BootStep {
  id: string;
  description: string;
  execute(): Promise<void>;
  rollback(): Promise<void>;
}

export interface BootReport {
  success: boolean;
  steps: BootStepResult[];
  durationMs: number;
  error?: string;
}

export interface BootStepResult {
  id: string;
  status: "completed" | "failed" | "rolled_back";
  durationMs: number;
  error?: string;
}
