// SPRINT 10: Semantic Memory — remembers what happened before
// "Yang kemarin masih error" → resolves to "inventorySaveBug"

interface MemoryEntry {
  id: string;
  problem: string;       // What was the issue
  resolution: string;    // What happened
  domain: string;
  entities: string[];
  timestamp: string;
}

const memory: MemoryEntry[] = [];
const MAX_MEMORY = 20;

export function remember(entry: MemoryEntry): void {
  memory.push(entry);
  if (memory.length > MAX_MEMORY) memory.shift();
}

/** Resolve "yang kemarin" type references to actual problems */
export function recall(reference: string): MemoryEntry | null {
  const lower = reference.toLowerCase();
  // Match: "yang kemarin", "sebelumnya", "tadi", "masih", "belum selesai"
  if (!/(kemarin|sebelumnya|tadi|masih|belum|yang\s+lama|yang\s+dulu)/i.test(lower)) return null;

  // Return most recent matching entry
  return memory.length > 0 ? memory[memory.length - 1] : null;
}

/** Augment a message with memory context */
export function augmentWithMemory(message: string): string {
  const recalled = recall(message);
  if (!recalled) return message;
  return `${message}\n\n[Referensi: "${recalled.problem}" (domain: ${recalled.domain}, status: ${recalled.resolution})]\n`;
}

export const semanticMemory = {
  name: "SemanticMemory",
  version: "1.0.0",
  capabilities: ["context-retention", "reference-resolution", "conversation-memory"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
