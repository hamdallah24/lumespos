// SPRINT 6: Knowledge Classification — security levels for all content
// Knowledge Loader and Security Filter respect these levels

export enum Classification {
  PUBLIC = "PUBLIC",            // Safe for any context, any LLM
  INTERNAL = "INTERNAL",        // Internal docs, architecture, standards
  CONFIDENTIAL = "CONFIDENTIAL", // Business data, metrics, customer info
  SECRET = "SECRET",            // API keys, tokens, credentials
  FOUNDER_ONLY = "FOUNDER_ONLY" // Founder access only — NEVER leaves VPS
}

// Classification hierarchy — lower index = more accessible
const LEVEL_HIERARCHY: Classification[] = [
  Classification.PUBLIC,
  Classification.INTERNAL,
  Classification.CONFIDENTIAL,
  Classification.SECRET,
  Classification.FOUNDER_ONLY,
];

/** Check if content at this level can be sent to external LLM */
export function canSendToLLM(level: Classification): boolean {
  return level === Classification.PUBLIC || level === Classification.INTERNAL;
}

/** Check if content can be included in context for a given user role */
export function canAccess(level: Classification, userRole: string): boolean {
  if (userRole === "owner") return true;
  if (userRole === "manager") return level !== Classification.FOUNDER_ONLY;
  if (userRole === "cashier") return level === Classification.PUBLIC;
  return false;
}

/** Get the most restricted classification from a list */
export function maxLevel(levels: Classification[]): Classification {
  if (levels.length === 0) return Classification.PUBLIC;
  let max = 0;
  for (const l of levels) {
    const idx = LEVEL_HIERARCHY.indexOf(l);
    if (idx > max) max = idx;
  }
  return LEVEL_HIERARCHY[max];
}

/** Classify content based on pattern matching */
export function classifyContent(content: string): Classification {
  const lower = content.toLowerCase();
  // FOUNDER_ONLY patterns
  if (process.env.AUTH_SECRET && lower.includes(process.env.AUTH_SECRET.toLowerCase())) return Classification.FOUNDER_ONLY;
  if (process.env.SESSION_SECRET && lower.includes(process.env.SESSION_SECRET.toLowerCase())) return Classification.FOUNDER_ONLY;
  // SECRET patterns
  if (/api.?key|secret|token|password|credential/i.test(lower)) return Classification.SECRET;
  if (/sk-[a-zA-Z0-9]{20,}/.test(content)) return Classification.SECRET;
  if (/Bearer [A-Za-z0-9_-]{20,}/.test(content)) return Classification.SECRET;
  // CONFIDENTIAL patterns
  if (/revenue|profit|margin|salary|financial|payment/i.test(lower)) return Classification.CONFIDENTIAL;
  if (/\d{16}/.test(content)) return Classification.CONFIDENTIAL; // credit card pattern
  // Default
  return Classification.INTERNAL;
}

export const classificationSystem = {
  name: "ClassificationSystem",
  version: "1.0.0",
  capabilities: ["content-classification", "access-control", "secret-detection"],
  dependencies: [],
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
