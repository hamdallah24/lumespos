import type { ActionHandler } from "./ActionHandler";

export class ActionRegistry {
  private handlers = new Map<string, ActionHandler>();

  register(handler: ActionHandler): void {
    if (this.handlers.has(handler.action)) {
      console.warn(`[ActionRegistry] Overwriting handler for action: ${handler.action}`);
    }
    this.handlers.set(handler.action, handler);
  }

  get(action: string): ActionHandler | undefined {
    return this.handlers.get(action);
  }

  has(action: string): boolean {
    return this.handlers.has(action);
  }

  getAllActions(): string[] {
    return Array.from(this.handlers.keys());
  }

  getAllByModule(module: string): ActionHandler[] {
    return Array.from(this.handlers.values()).filter(h => h.module === module);
  }

  size(): number {
    return this.handlers.size;
  }
}
