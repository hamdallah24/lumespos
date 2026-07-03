// ECP-035: Kernel Registry — centralized runtime registration
// Frozen. All runtimes register here. Kernel knows the full org.

import type { KernelComponent } from "./kernel-types";

class KernelRegistry {
  private _components = new Map<string, KernelComponent>();

  register(component: KernelComponent): void {
    if (this._components.has(component.name)) {
      console.warn(`[Kernel] ${component.name} already registered — updating`);
    }
    component.status = "registered";
    this._components.set(component.name, component);
    console.log(`[Kernel] Registered: ${component.name} v${component.version} (${component.type})`);
  }

  unregister(name: string): boolean {
    return this._components.delete(name);
  }

  get(name: string): KernelComponent | undefined {
    return this._components.get(name);
  }

  getByType(type: KernelComponent["type"]): KernelComponent[] {
    return [...this._components.values()].filter(c => c.type === type);
  }

  getAll(): KernelComponent[] {
    return [...this._components.values()];
  }

  health(): Record<string, { status: string }> {
    const result: Record<string, { status: string }> = {};
    for (const [name, comp] of this._components) {
      try { result[name] = comp.health(); } catch { result[name] = { status: "unknown" }; }
    }
    return result;
  }

  get size(): number { return this._components.size; }
}

export const kernelRegistry = new KernelRegistry();
