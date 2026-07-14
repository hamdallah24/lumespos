import { foundationLoader } from "../foundation-loader";
import { existsSync, readFileSync } from "fs";
import { join, resolve } from "path";

export interface FoundationDocument {
  id: string;
  title: string;
  version: string;
  owner: string;
  consumer: string;
  layer: string;
  domain: string;
  executive: string;
  status: string;
  canonical: boolean;
  dependencies: string[];
  tags: string[];
  content: string;
}

export interface RegistryIndex {
  byId: Map<string, FoundationDocument>;
  byLayer: Map<string, FoundationDocument[]>;
  byDomain: Map<string, FoundationDocument[]>;
  byOwner: Map<string, FoundationDocument[]>;
  byExecutive: Map<string, FoundationDocument[]>;
  byStatus: Map<string, FoundationDocument[]>;
}

class FoundationRegistry {
  private index: RegistryIndex | null = null;

  private buildIndex(): RegistryIndex {
    const assets = foundationLoader.load();
    const byId = new Map<string, FoundationDocument>();
    const byLayer = new Map<string, FoundationDocument[]>();
    const byDomain = new Map<string, FoundationDocument[]>();
    const byOwner = new Map<string, FoundationDocument[]>();
    const byExecutive = new Map<string, FoundationDocument[]>();
    const byStatus = new Map<string, FoundationDocument[]>();

    for (const asset of assets) {
      const doc: FoundationDocument = {
        id: asset.id,
        title: asset.title,
        version: (asset as any).version || "0.0.0",
        owner: (asset as any).owner || "unknown",
        consumer: (asset as any).consumer || "unknown",
        layer: (asset as any).layer || "unknown",
        domain: asset.domain,
        executive: (asset as any).executive || "ALL",
        status: (asset as any).status || "unknown",
        canonical: (asset as any).canonical !== "false",
        dependencies: asset.depends_on || [],
        tags: (asset as any).tags || [],
        content: asset.content,
      };

      byId.set(doc.id, doc);
      this.addToIndex(byLayer, doc.layer, doc);
      this.addToIndex(byDomain, doc.domain, doc);
      this.addToIndex(byOwner, doc.owner, doc);
      this.addToIndex(byExecutive, doc.executive, doc);
      this.addToIndex(byStatus, doc.status, doc);
    }

    this.index = { byId, byLayer, byDomain, byOwner, byExecutive, byStatus };
    return this.index;
  }

  private addToIndex(map: Map<string, FoundationDocument[]>, key: string, doc: FoundationDocument): void {
    const existing = map.get(key) || [];
    existing.push(doc);
    map.set(key, existing);
  }

  getIndex(): RegistryIndex {
    if (!this.index) this.buildIndex();
    return this.index!;
  }

  lookup(id: string): FoundationDocument | undefined {
    return this.getIndex().byId.get(id);
  }

  findByLayer(layer: string): FoundationDocument[] {
    return this.getIndex().byLayer.get(layer) || [];
  }

  findByDomain(domain: string): FoundationDocument[] {
    return this.getIndex().byDomain.get(domain) || [];
  }

  findByOwner(owner: string): FoundationDocument[] {
    return this.getIndex().byOwner.get(owner) || [];
  }

  findByExecutive(executive: string): FoundationDocument[] {
    return this.getIndex().byExecutive.get(executive) || [];
  }

  resolveDependencies(id: string): FoundationDocument[] {
    const doc = this.lookup(id);
    if (!doc) return [];
    const resolved: FoundationDocument[] = [];
    const visited = new Set<string>();
    const queue = [...doc.dependencies];
    while (queue.length > 0) {
      const depId = queue.shift()!;
      if (visited.has(depId)) continue;
      visited.add(depId);
      const dep = this.lookup(depId);
      if (dep) {
        resolved.push(dep);
        queue.push(...dep.dependencies);
      }
    }
    return resolved;
  }

  getCanonical(layer: string, domain: string): FoundationDocument | undefined {
    const docs = this.getIndex().byLayer.get(layer) || [];
    return docs.find((d) => d.domain === domain && d.canonical);
  }

  refresh(): void {
    this.index = null;
  }

  getStats(): { total: number; byLayer: Record<string, number>; byStatus: Record<string, number> } {
    const idx = this.getIndex();
    const total = idx.byId.size;
    const byLayer: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const [k, v] of idx.byLayer) byLayer[k] = v.length;
    for (const [k, v] of idx.byStatus) byStatus[k] = v.length;
    return { total, byLayer, byStatus };
  }
}

export const foundationRegistry = new FoundationRegistry();
