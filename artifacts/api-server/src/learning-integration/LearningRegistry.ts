import type { LearningEngine, LearningEngineInfo, LearningCapability } from "./types";

class LearningRegistryImpl {
  private engines = new Map<string, LearningEngine>();

  register(engine: LearningEngine): void {
    if (this.engines.has(engine.info.id)) {
      throw new Error(`Engine already registered: ${engine.info.id}`);
    }
    const nameConflict = Array.from(this.engines.values()).some(e => e.info.name === engine.info.name);
    if (nameConflict) {
      throw new Error(`Engine name already registered: ${engine.info.name}`);
    }
    this.engines.set(engine.info.id, engine);
  }

  unregister(id: string): boolean {
    return this.engines.delete(id);
  }

  get(id: string): LearningEngine | undefined {
    return this.engines.get(id);
  }

  getAll(): LearningEngine[] {
    return Array.from(this.engines.values());
  }

  getByCapability(capability: LearningCapability): LearningEngine[] {
    return this.getAll().filter(e => e.info.capabilities.includes(capability));
  }

  getInfo(id: string): LearningEngineInfo | undefined {
    return this.engines.get(id)?.info;
  }

  getAllInfo(): LearningEngineInfo[] {
    return this.getAll().map(e => e.info);
  }

  count(): number {
    return this.engines.size;
  }

  validateCapabilityConflicts(): string[] {
    const warnings: string[] = [];
    const all = this.getAll();
    for (const engine of all) {
      const caps = engine.info.capabilities;
      if (caps.includes("retrieval") && caps.includes("feedback") && !caps.includes("ingestion")) {
        warnings.push(`${engine.info.id}: has retrieval+feedback but no ingestion`);
      }
    }
    return warnings;
  }
}

export const LearningRegistry = new LearningRegistryImpl();
