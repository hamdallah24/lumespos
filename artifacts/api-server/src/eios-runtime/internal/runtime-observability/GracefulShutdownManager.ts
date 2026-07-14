import { RuntimeLogger } from "./RuntimeLogger";

interface ShutdownStep {
  name: string;
  order: number;
  execute: () => Promise<void>;
}

const steps: ShutdownStep[] = [];
let shuttingDown = false;

export const GracefulShutdownManager = {
  register(name: string, order: number, execute: () => Promise<void>): void {
    steps.push({ name, order, execute });
  },

  async shutdown(timeoutMs = 30000): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;

    const sorted = [...steps].sort((a, b) => a.order - b.order);
    const start = Date.now();

    for (const step of sorted) {
      if (Date.now() - start > timeoutMs) {
        RuntimeLogger.warn("ShutdownManager", "Timeout reached", { metadata: { step: step.name } });
        break;
      }
      try {
        await step.execute();
      } catch (err) {
        RuntimeLogger.error("ShutdownManager", "Step failed", { metadata: { step: step.name }, error: String(err) });
      }
    }

    shuttingDown = false;
  },

  isShuttingDown(): boolean { return shuttingDown; },
};
