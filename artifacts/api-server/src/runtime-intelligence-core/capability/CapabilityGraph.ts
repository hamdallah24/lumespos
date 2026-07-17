import type {
  CapabilityNode,
  CapabilityHealth,
  ToolDescriptor,
  CapabilityGraph as CapabilityGraphInterface,
} from '../types';

export class CapabilityGraph implements CapabilityGraphInterface {
  private nodes: Map<string, CapabilityNode> = new Map();

  register(node: CapabilityNode): void {
    this.nodes.set(node.name, node);
  }

  registerFromTools(tools: ToolDescriptor[]): void {
    for (const tool of tools) {
      for (const cap of tool.capabilities) {
        if (!this.nodes.has(cap)) {
          this.nodes.set(cap, {
            name: cap,
            domain: 'general',
            description: `Capability: ${cap}`,
            groundingProviders: [],
            tools: [tool.id],
            executives: [],
            health: tool.enabled ? 'healthy' : 'offline',
          });
        } else {
          const existing = this.nodes.get(cap)!;
          if (!existing.tools.includes(tool.id)) {
            existing.tools.push(tool.id);
          }
        }
      }
    }
  }

  registerFromExecutives(executives: { name: string; domain: string; capabilities: string[] }[]): void {
    for (const exec of executives) {
      for (const cap of exec.capabilities) {
        if (!this.nodes.has(cap)) {
          this.nodes.set(cap, {
            name: cap,
            domain: exec.domain,
            description: `Capability provided by ${exec.name}`,
            groundingProviders: [],
            tools: [],
            executives: [exec.name],
            health: 'healthy',
          });
        } else {
          const existing = this.nodes.get(cap)!;
          if (!existing.executives.includes(exec.name)) {
            existing.executives.push(exec.name);
          }
        }
      }
    }
  }

  getCapability(name: string): CapabilityNode | null {
    return this.nodes.get(name) ?? null;
  }

  findCapabilitiesByDomain(domain: string): CapabilityNode[] {
    return Array.from(this.nodes.values()).filter(n => n.domain === domain);
  }

  findCapabilitiesByExecutive(executive: string): CapabilityNode[] {
    return Array.from(this.nodes.values()).filter(n => n.executives.includes(executive));
  }

  isCapabilitySupported(name: string): boolean {
    const node = this.nodes.get(name);
    return node !== undefined && node.health !== 'offline' && node.health !== 'deprecated';
  }

  getCapabilityHealth(name: string): CapabilityHealth | null {
    return this.nodes.get(name)?.health ?? null;
  }

  setHealth(name: string, health: CapabilityHealth): void {
    const node = this.nodes.get(name);
    if (node) {
      node.health = health;
    }
  }

  getAllCapabilities(): CapabilityNode[] {
    return Array.from(this.nodes.values());
  }

  getCapabilitiesByHealth(health: CapabilityHealth): CapabilityNode[] {
    return Array.from(this.nodes.values()).filter(n => n.health === health);
  }

  count(): number {
    return this.nodes.size;
  }

  clear(): void {
    this.nodes.clear();
  }
}
