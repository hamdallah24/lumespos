// ADR-010 Phase 3: Model Density Config
// Each model tokenizes text differently. Budget auto-adjusts.

export interface ModelDensity {
  name: string;
  density: number;   // tokens per 4 chars. 1.0 = standard, 1.5 = 50% more tokens
  maxOutput: number; // max output tokens per call
  responseTime: number; // avg ms per 1K tokens
}

export const MODEL_DENSITY: Record<string, ModelDensity> = {
  "deepseek-chat":       { name: "deepseek-chat",       density: 1.0, maxOutput: 8000,  responseTime: 800 },
  "deepseek-v4-pro":     { name: "deepseek-v4-pro",     density: 1.55, maxOutput: 8000, responseTime: 900 },
  "deepseek-reasoner":   { name: "deepseek-reasoner",   density: 1.4, maxOutput: 8000,  responseTime: 1200 },
  "gpt-4o":              { name: "gpt-4o",              density: 1.0, maxOutput: 4096,  responseTime: 600 },
  "gpt-4-turbo":         { name: "gpt-4-turbo",         density: 1.0, maxOutput: 4096,  responseTime: 500 },
  "claude-3-opus":       { name: "claude-3-opus",       density: 1.2, maxOutput: 4096,  responseTime: 700 },
  "claude-3-sonnet":     { name: "claude-3-sonnet",     density: 1.15, maxOutput: 4096, responseTime: 500 },
  "claude-3-haiku":      { name: "claude-3-haiku",      density: 1.1, maxOutput: 4096,  responseTime: 300 },
  "gemini-2.5-flash":    { name: "gemini-2.5-flash",    density: 0.95, maxOutput: 8192, responseTime: 400 },
  "gemini-2.5-pro":      { name: "gemini-2.5-pro",      density: 1.0, maxOutput: 8192,  responseTime: 600 },
};

const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";

export function getModelDensity(modelName?: string): ModelDensity {
  const name = modelName || DEFAULT_MODEL;
  return MODEL_DENSITY[name] || { name, density: 1.0, maxOutput: 4000, responseTime: 800 };
}

/** Convert raw character count to estimated tokens using model density */
export function charsToTokens(chars: number, modelName?: string): number {
  const model = getModelDensity(modelName);
  return Math.ceil((chars / 4) * model.density);
}
