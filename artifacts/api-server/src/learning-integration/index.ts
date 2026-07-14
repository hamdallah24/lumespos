export { LearningRegistry } from "./LearningRegistry";
export { IntegrationManager } from "./IntegrationManager";
export type { LearningEngine, LearningEngineInfo, LearningCapability, UnifiedLearningResult, RetrieveInput, IngestInput, HealthStatus } from "./types";

// Adapters
export { orgLearningAdapter } from "./adapters/org-learning-adapter";
export { kpLearningAdapter } from "./adapters/kp-learning-adapter";
export { councilLearningAdapter } from "./adapters/council-learning-adapter";

// Auto-register adapters on first import
import { LearningRegistry } from "./LearningRegistry";
import { orgLearningAdapter } from "./adapters/org-learning-adapter";
import { kpLearningAdapter } from "./adapters/kp-learning-adapter";
import { councilLearningAdapter } from "./adapters/council-learning-adapter";

let initialized = false;

export function registerAllEngines(): void {
  if (initialized) return;
  initialized = true;
  try { LearningRegistry.register(orgLearningAdapter); } catch { }
  try { LearningRegistry.register(kpLearningAdapter); } catch { }
  try { LearningRegistry.register(councilLearningAdapter); } catch { }
}
