// ECP-044 Sprint 4b: Memory Index
// Searchable index for fast knowledge retrieval.
// Indexes by domain, type, keywords, executive.

import type { KnowledgeNode, IndexEntry, NodeType, ExecutiveRole } from "./learning-types";

export class MemoryIndex {
  private index: Map<string, IndexEntry[]> = new Map();

  /** Index a knowledge node */
  add(node: KnowledgeNode): void {
    const keywords = this.extractKeywords(node.content);
    const entry: IndexEntry = {
      nodeId: node.id,
      domain: node.domain,
      type: node.type,
      keywords,
      confidence: node.confidence,
      reinforced: node.reinforced,
      executive: node.source.executive,
    };

    // Index by domain
    this.append(node.domain, entry);
    // Index by type
    this.append(`type:${node.type}`, entry);
    // Index by executive
    this.append(`exec:${node.source.executive}`, entry);
    // Index by keywords
    for (const kw of keywords) {
      this.append(`kw:${kw}`, entry);
    }
  }

  /** Remove a node from index */
  remove(nodeId: string): void {
    for (const [key, entries] of this.index) {
      this.index.set(key, entries.filter(e => e.nodeId !== nodeId));
    }
  }

  /** Search by query */
  search(query: string, limit: number = 20): IndexEntry[] {
    const lower = query.toLowerCase();
    const seen = new Set<string>();
    const results: IndexEntry[] = [];

    // Direct domain match
    const domainEntries = this.index.get(lower) || [];
    for (const e of domainEntries) {
      if (!seen.has(e.nodeId)) { seen.add(e.nodeId); results.push(e); }
    }

    // Keyword match
    for (const [key, entries] of this.index) {
      if (!key.startsWith("kw:")) continue;
      const kw = key.slice(3);
      if (lower.includes(kw)) {
        for (const e of entries) {
          if (!seen.has(e.nodeId)) { seen.add(e.nodeId); results.push(e); }
        }
      }
    }

    return results
      .sort((a, b) => (b.reinforced * b.confidence) - (a.reinforced * a.confidence))
      .slice(0, limit);
  }

  /** Search by domain + executive */
  findByExecutive(executive: ExecutiveRole): IndexEntry[] {
    return (this.index.get(`exec:${executive}`) || [])
      .sort((a, b) => b.reinforced - a.reinforced);
  }

  /** Get all entries for a domain */
  getDomain(domain: string): IndexEntry[] {
    return (this.index.get(domain) || [])
      .sort((a, b) => b.confidence - a.confidence);
  }

  /** Clear index */
  clear(): void {
    this.index.clear();
  }

  /** Get index stats */
  stats() {
    let total = 0;
    const domains = new Set<string>();
    for (const [key, entries] of this.index) {
      total += entries.length;
      if (!key.startsWith("type:") && !key.startsWith("exec:") && !key.startsWith("kw:")) {
        domains.add(key);
      }
    }
    return { totalEntries: total, indexedDomains: domains.size, uniqueKeys: this.index.size };
  }

  // ── Private ──

  private append(key: string, entry: IndexEntry): void {
    const entries = this.index.get(key) || [];
    entries.push(entry);
    this.index.set(key, entries);
  }

  private extractKeywords(content: string): string[] {
    return content
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3 && !/^(yang|dari|dengan|untuk|akan|telah|pada|dalam|juga|atau|tetap|tidak|bukan|sangat|lebih)$/i.test(w))
      .slice(0, 10);
  }
}

export const memoryIndex = new MemoryIndex();
