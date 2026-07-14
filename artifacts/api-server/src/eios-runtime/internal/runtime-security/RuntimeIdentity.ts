const RUNTIME_ID = `eios-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

interface Identity {
  id: string;
  type: "runtime" | "node" | "plugin" | "executive";
  name: string;
  issuedAt: string;
}

let nodeId: string | null = null;

export const RuntimeIdentity = {
  getRuntimeId(): string { return RUNTIME_ID; },

  setNodeId(id: string): void { nodeId = id; },
  getNodeId(): string { return nodeId || `node-${Date.now().toString(36)}`; },

  createIdentity(type: Identity["type"], name: string): Identity {
    return { id: `${type}-${name}-${Date.now().toString(36)}`, type, name, issuedAt: new Date().toISOString() };
  },

  verifyIdentity(identity: Identity): boolean {
    if (!identity.id || !identity.type || !identity.name) return false;
    if (!identity.issuedAt) return false;
    const issued = new Date(identity.issuedAt).getTime();
    if (isNaN(issued)) return false;
    if (Date.now() - issued > 86400000) return false;
    return true;
  },
};
