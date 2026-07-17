import type {
  RuntimeContext,
  ReasonerInput,
} from './types';
import { RuntimeIntelligenceCore } from './RuntimeIntelligenceCore';
import { DeepSeekProvider } from './providers/DeepSeekProvider';
import { CapabilityGraph as CapabilityGraphImpl } from './capability/CapabilityGraph';
import { ToolCatalog } from './registry/ToolCatalog';
import { mapToExecutive } from './ExecutiveContextAdapter';
import type { ExecutiveContext } from './ExecutiveContextAdapter';

interface AdapterInput {
  message: string;
  userId: string | number;
  branchId?: number;
}

export class RICAdapter {
  private core: RuntimeIntelligenceCore | null = null;
  private toolCatalog: ToolCatalog | null = null;
  private initialized = false;
  private lastExecutiveContext: ExecutiveContext | null = null;

  async initialize(rootDir: string): Promise<void> {
    if (this.initialized) return;

    const capabilityGraph = new CapabilityGraphImpl();
    const provider = new DeepSeekProvider();
    this.core = new RuntimeIntelligenceCore(capabilityGraph, provider, rootDir);
    this.toolCatalog = new ToolCatalog();
    await this.core.initialize();
    this.initialized = true;
  }

  isEnabled(): boolean { return this.core !== null; }
  getCore(): RuntimeIntelligenceCore | null { return this.core; }
  getToolCatalog(): ToolCatalog | null { return this.toolCatalog; }

  getExecutiveContext(): ExecutiveContext | null {
    return this.lastExecutiveContext;
  }

  async assemble(input: AdapterInput): Promise<RuntimeContext> {
    if (!this.core) throw new Error('RIC not initialized');

    const reasonerInput: ReasonerInput = {
      message: input.message,
      conversationHistory: [],
      availableDomains: [],
      availableTools: [],
      availableMemoryStores: ['working', 'decision', 'knowledge', 'episodic', 'mission', 'conversation'],
      repositoryIndex: [],
      tenantContext: { tenantId: 'default', branchId: String(input.branchId ?? ''), userId: String(input.userId) },
      thinkingMode: 'balanced',
    };

    const ctx = await this.core.assemble(reasonerInput);
    this.lastExecutiveContext = mapToExecutive(ctx);
    return ctx;
  }
}

let instance: RICAdapter | null = null;

export function getRICAdapter(): RICAdapter {
  if (!instance) instance = new RICAdapter();
  return instance;
}

export async function initializeRIC(rootDir: string): Promise<void> {
  await getRICAdapter().initialize(rootDir);
}
