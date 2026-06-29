// SPRINT 3: Validator — pure component (input → validate → output)
// Extracted from ai-helpers.ts. No knowledge of LLM, Tools, or Memory.

export interface ValidationResult {
  isValid: boolean;
  cleanedText: string;
  warnings: string[];
}

/** Strip hallucinated DSML tool call tags from text */
export function stripDSML(text: string): string {
  return text.replace(/<｜｜DSML｜｜[\s\S]*?>/g, "").replace(/<\/｜｜DSML｜｜[\s\S]*?>/g, "").trim();
}

/** Parse DSML tool calls from hallucinated text — fallback for streaming bugs */
export function parseDSMLToolCalls(text: string): any[] | null {
  if (!text?.includes("<｜｜DSML｜｜tool_calls>")) return null;
  const toolCalls: any[] = [];
  const invokeRegex = /<｜｜DSML｜｜invoke name="([^"]+)">([\s\S]*?)<\/｜｜DSML｜｜invoke>/g;
  const paramRegex = /<｜｜DSML｜｜parameter name="([^"]+)"[^>]*>([\s\S]*?)<\/｜｜DSML｜｜parameter>/g;
  let invokeMatch;
  while ((invokeMatch = invokeRegex.exec(text)) !== null) {
    const toolName = invokeMatch[1];
    const paramBlock = invokeMatch[2];
    const args: Record<string, string> = {};
    let paramMatch;
    while ((paramMatch = paramRegex.exec(paramBlock)) !== null) {
      args[paramMatch[1]] = paramMatch[2].trim();
    }
    toolCalls.push({ id: `call_${Date.now()}_${toolCalls.length}`, type: "function", function: { name: toolName, arguments: JSON.stringify(args) } });
  }
  return toolCalls.length > 0 ? toolCalls : null;
}

/** Validate message sequence — assistant tool_calls must be followed by tool messages */
export function validateMessageSequence(msgs: any[]) {
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === "assistant" && m.tool_calls?.length > 0) {
      const next = msgs[i + 1];
      if (!next || next.role !== "tool") {
        throw new Error(`Invalid sequence at index ${i}: assistant tool_calls not followed by tool message. Next role: ${next?.role ?? "nothing"}`);
      }
    }
  }
}

/** Sanitize messages — ensure content is string or null, never undefined */
export function sanitizeMessages(msgs: any[]): any[] {
  return msgs
    .filter(m => m !== null && m !== undefined && m.role)
    .map(m => {
      let content: string | null;
      if (m.content === undefined) content = null;
      else if (typeof m.content === "string") content = m.content;
      else content = JSON.stringify(m.content);
      return { ...m, content };
    });
}

/** Validate AI response — contamination detection, completion check, DSML fragments */
export function validateResponse(text: string): ValidationResult {
  if (!text) return { isValid: true, cleanedText: text, warnings: [] };
  const warnings: string[] = [];
  let cleaned = text;

  const shellCmdRe = /^(cd |grep |wc |find |ls |cat |head |tail |pm2 |ssh |scp |sudo |pnpm |npm |git )/;
  const shellCommandLines = text.split("\n").filter(line =>
    shellCmdRe.test(line.trim()) ||
    /\|(\||\s*)/.test(line.trim()) ||
    /&&/.test(line.trim()) ||
    /2>\/dev\/null/.test(line)
  );

  const garbledPatterns = [
    /(artifacts\w+\.\.\.\w+)/,
    /(\w+\|\w+\|\w+)/,
    /(\w+\\\.\\\.)/,
    /undefined(?=[a-z])/i,
  ];

  if (shellCommandLines.length > 0) {
    warnings.push(`CONTAMINATION: ${shellCommandLines.length} shell command(s) detected in response`);
    cleaned = cleaned.split("\n").filter(line => !shellCommandLines.includes(line)).join("\n");
  }

  for (const pattern of garbledPatterns) {
    if (pattern.test(text)) {
      warnings.push("CONTAMINATION: garbled/corrupted text pattern detected");
      break;
    }
  }

  if (text.length < 20 && !/^(ok|ya|tidak|yes|no|done)$/i.test(text.trim())) {
    warnings.push(`INCOMPLETE: response too short (${text.length} chars)`);
  }

  if (/<｜｜DSML｜｜/i.test(text) || /<\/｜｜DSML｜｜/i.test(text)) {
    warnings.push("DSML_FRAGMENT: tool call tags still present in response");
    cleaned = stripDSML(cleaned);
  }

  return {
    isValid: warnings.length === 0 || warnings.every(w => !w.startsWith("DSML_FRAGMENT")),
    cleanedText: cleaned.trim() || text.trim(),
    warnings,
  };
}

// ── Component metadata for registry ──

export const validator = {
  name: "Validator",
  version: "1.0.0",
  capabilities: ["response-validation", "dsml-strip", "contamination-detection", "message-sanitization", "sequence-validation"],
  dependencies: [], // Pure component — no dependencies
  health: () => ({ status: "healthy" as const, uptime: 0, dependencies: [], version: "1.0.0" }),
};
