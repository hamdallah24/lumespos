// ─────────────────────────────────────────────────────────────
// AI HELPERS — Compatibility barrel for backward compat
// ECP-040: All logic moved to llm/ and tools/.
// Fix Pack A: Memory moved to services/ai-memory-service.ts.
// This file: re-exports only. No implementations.
// ─────────────────────────────────────────────────────────────
import { db, sharedContextTable, checklistItemsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";

// ── DEEPSEEK / SUMOPOD ──
export { callDeepSeek } from "../ai/llm/llm-adapter";

// ── TOOLS (moved to tool-adapter.ts — re-exported for backward compat) ──
export {
  PROJECT_ROOT, GITHUB_PAT, GITHUB_REPO, GITHUB_RAW,
  SSH_HOST, SSH_USER, SSH_PASS, SSH_KEY_PATH,
  fetchGitHubFile, fetchGitHubDir, searchRepoFiles,
  sshExec, getDependencies,
  listLocalDir, readLocalFile, searchLocalContent,
  writeLocalFile, editLocalFile, execLocalCommand,
  mergeDeploy,
  LOCAL_TOOLS, getToolLabel, readFileWithFallback, executeToolCall,
} from "../ai/tools/tool-adapter";
export type { ToolDef } from "../ai/tools/tool-adapter";

// ── MEMORY (re-export from service layer) ──
export { remember, getHistory, getOrCreateConversation, clearMemory } from "../services/ai-memory-service";

// ── SHARED CONTEXT (agent-to-agent communication) ──
export async function saveSharedContext(userId: number, mode: string, summary: string) {
  try {
    await db.insert(sharedContextTable).values({ userId, mode, summary: summary.slice(0, 2000) });
  } catch (e) {
    console.error("[ai] DB saveSharedContext error:", e);
  }
}

export async function getSharedContext(userId: number, limit = 5): Promise<string> {
  try {
    const rows = await db.select()
      .from(sharedContextTable)
      .where(eq(sharedContextTable.userId, userId))
      .orderBy(desc(sharedContextTable.createdAt))
      .limit(limit);
    if (rows.length === 0) return "";
    return rows.map(r => `[${r.mode}] ${r.summary}`).join("\n");
  } catch (e) {
    console.error("[ai] DB getSharedContext error:", e);
    return "";
  }
}

// ── CHECKLIST ITEMS ──
export async function getChecklistItems(conversationId: number): Promise<{ itemKey: string; text: string; checked: boolean }[]> {
  try {
    const rows = await db.select()
      .from(checklistItemsTable)
      .where(eq(checklistItemsTable.conversationId, conversationId))
      .orderBy(checklistItemsTable.createdAt);
    return rows.map(r => ({ itemKey: r.itemKey, text: r.text, checked: r.checked }));
  } catch (e) {
    console.error("[ai] DB getChecklistItems error:", e);
    return [];
  }
}

export async function upsertChecklistItem(conversationId: number, itemKey: string, text: string, checked: boolean) {
  try {
    const existing = await db.select().from(checklistItemsTable)
      .where(and(eq(checklistItemsTable.conversationId, conversationId), eq(checklistItemsTable.itemKey, itemKey)))
      .limit(1);
    if (existing.length > 0) {
      await db.update(checklistItemsTable).set({ checked }).where(eq(checklistItemsTable.id, existing[0].id));
    } else {
      await db.insert(checklistItemsTable).values({ conversationId, itemKey, text, checked });
    }
  } catch (e) {
    console.error("[ai] DB upsertChecklistItem error:", e);
  }
}

export async function clearChecklistItems(conversationId: number) {
  try {
    await db.delete(checklistItemsTable).where(eq(checklistItemsTable.conversationId, conversationId));
  } catch (e) {
    console.error("[ai] DB clearChecklistItems error:", e);
  }
}


export { callDeepSeekWithTools } from "../ai/llm/llm-adapter";

// ── RATE LIMITER (per-user sliding window) ──
const RATE_WINDOW_MS = 60000;
interface RateEntry { windowStart: number; count: number }
const rateMap = new Map<string, RateEntry>();

export function checkRateLimit(userId: number, mode: string, maxRequests: number): { ok: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `${userId}_${mode}`;
  const entry = rateMap.get(key);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateMap.set(key, { windowStart: now, count: 1 });
    return { ok: true };
  }
  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_WINDOW_MS - now) / 1000);
    return { ok: false, retryAfter };
  }
  entry.count++;
  return { ok: true };
}
