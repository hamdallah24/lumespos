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

/** Validate message sequence — assistant tool_calls must be followed by enough tool messages */
export function validateMessageSequence(msgs: any[]) {
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i];
    if (m.role === "assistant" && m.tool_calls?.length > 0) {
      // Check: next message must be tool
      const next = msgs[i + 1];
      if (!next || next.role !== "tool") {
        throw new Error(`Invalid sequence at index ${i}: assistant tool_calls not followed by tool message. Next role: ${next?.role ?? "nothing"}`);
      }
      // Check: sufficient tool messages for all tool_calls
      let toolCount = 0;
      for (let j = i + 1; j < msgs.length && msgs[j].role === "tool"; j++) toolCount++;
      if (toolCount < m.tool_calls.length) {
        throw new Error(`Invalid sequence at index ${i}: assistant has ${m.tool_calls.length} tool_calls but only ${toolCount} tool messages follow`);
      }
    }
  }
}

/** Sanitize messages — ensure content is string or null, never undefined */
export function sanitizeMessages(msgs: any[]): any[] {
  // TODO Sprint 10.x: Replace regex sanitizer with UTF-16 validator that preserves valid emoji
  // .replace(/[\uD800-\uDFFF]/g, "") strips BOTH invalid surrogates and valid emoji
  return msgs
    .filter(m => m !== null && m !== undefined && m.role)
    .map(m => {
      let content: string | null;
      if (m.content === undefined) content = null;
      else if (typeof m.content === "string") content = m.content;
      else content = JSON.stringify(m.content);
      return { ...m, content: content?.replace(/[\uD800-\uDFFF]/g, "") ?? null };
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
    { regex: /(artifacts\w+\.\.\.\w+)/g, replacement: "" },
    { regex: /(\w+\|\w+\|\w+)/g, replacement: "" },
    { regex: /(\w+\\\.\\\.)/g, replacement: "" },
    { regex: /undefined(?=[a-z])/gi, replacement: "" },
    { regex: /(\w+\/\w+\.\w+){3,}/g, replacement: "" },    // Path fragments concatenated
    { regex: /\w+\.(tsx?|md|json)\w+/gi, replacement: "" },  // File extensions merged
  ];

  if (shellCommandLines.length > 0) {
    warnings.push(`CONTAMINATION: ${shellCommandLines.length} shell command(s) detected in response`);
    cleaned = cleaned.split("\n").filter(line => !shellCommandLines.includes(line)).join("\n");
  }

  let garbledFound = false;
  for (const { regex, replacement } of garbledPatterns) {
    if (regex.test(cleaned)) {
      garbledFound = true;
      cleaned = cleaned.replace(regex, replacement);
    }
  }
  if (garbledFound) {
    warnings.push("CONTAMINATION: garbled text stripped from response");
  }

  if (text.length < 20 && !/^(ok|ya|tidak|yes|no|done)$/i.test(text.trim())) {
    warnings.push(`INCOMPLETE: response too short (${text.length} chars)`);
  }

  // Tolak output yang cuma angka (hasil wc -l, ls | wc -l, dll) tanpa analisis
  if (/^\d+\s*$/.test(cleaned.trim()) || /^(\d+\s)+$/.test(cleaned.trim())) {
    warnings.push("CONTAMINATION: output hanya berisi angka tanpa analisis");
    cleaned = "";
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
