// ─────────────────────────────────────────────────────────────
// AI HELPERS — DeepSeek, memory, GitHub, SSH, Local Tools
// ─────────────────────────────────────────────────────────────
import { exec } from "child_process";
import { existsSync } from "fs";
// Sprint 3: Event system import
import { emit, Events } from "../ai/runtime/events";
// Sprint 3.5: Observability
import { ExecutionContext, RuntimeState } from "../ai/runtime/execution-context";
import { finalize, errorTrace } from "../ai/runtime/trace";
import { logger } from "../ai/runtime/logger";
// Sprint 7.1: Foundation Loader
import { foundationLoader } from "../ai/runtime/foundation-loader";
// Sprint 7.2-7.3: Context Builder → Prompt Assembler
import { buildFoundationContext } from "../ai/runtime/context-builder";
import { assembleSystemPrompt } from "../ai/runtime/prompt-assembler";
// Sprint 8: Knowledge Loader as single entry point
import { loadKnowledgeWithContent } from "../ai/runtime/knowledge-loader";
// Sprint 3: Validator functions (import + re-export)
import { stripDSML, parseDSMLToolCalls, validateMessageSequence, sanitizeMessages, validateResponse } from "../ai/runtime/validator";
export { stripDSML, parseDSMLToolCalls, validateMessageSequence, sanitizeMessages, validateResponse };
// ECP-019: Execution Governor — replaces fixed MAX_ROUNDS loop
import { ExecutionGovernor } from "../ai/runtime/execution/execution-governor";
import { readdir, stat, readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname, resolve } from "path";
import { promisify } from "util";
const execP = promisify(exec);
import { execSync } from "child_process";
import { db, conversationsTable, messagesTable, sharedContextTable, checklistItemsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

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

// ── MEMORY (DB-backed) ──
type ChatMsg = { role: "user" | "assistant"; content: string };
const MAX_MEMORY = 10;

export async function getOrCreateConversation(userId: number, mode: string): Promise<number> {
  // Atomic upsert — no race condition: INSERT if not exists, RETURN id either way
  const result = await db.execute(
    sql`INSERT INTO ai_conversations (user_id, mode, created_at, updated_at)
        VALUES (${userId}, ${mode}, NOW(), NOW())
        ON CONFLICT (user_id, mode) DO UPDATE SET updated_at = NOW()
        RETURNING id`
  );
  return (result.rows[0] as any).id as number;
}

export async function getHistory(userId: number, mode: string, maxContentLength?: number): Promise<ChatMsg[]> {
  try {
    const convId = await getOrCreateConversation(userId, mode);
    const rows = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(messagesTable.id)
      .limit(MAX_MEMORY * 2);
    return rows.map(r => ({
      role: r.role as "user" | "assistant",
      content: maxContentLength && r.content.length > maxContentLength
        ? r.content.slice(0, maxContentLength) + "…"
        : r.content,
    }));
  } catch (e) {
    console.error("[ai] DB getHistory error:", e);
    return [];
  }
}

export async function remember(userId: number, mode: string, userMsg: string, assistantReply: string) {
  try {
    const convId = await getOrCreateConversation(userId, mode);
    // Single transaction: INSERT + PRUNE + UPDATE = 1 round trip
    await db.transaction(async (tx) => {
      await tx.insert(messagesTable).values([
        { conversationId: convId, role: "user", content: userMsg.slice(0, 1000) },
        { conversationId: convId, role: "assistant", content: assistantReply.slice(0, 4000) },
      ]);
      // Prune: keep only newest MAX_MEMORY*2 messages
      await tx.execute(
        sql`DELETE FROM ai_messages
            WHERE conversation_id = ${convId}
              AND id NOT IN (
                SELECT id FROM ai_messages
                WHERE conversation_id = ${convId}
                ORDER BY id DESC
                LIMIT ${MAX_MEMORY * 2}
              )`
      );
      await tx.update(conversationsTable)
        .set({ updatedAt: new Date() })
        .where(eq(conversationsTable.id, convId));
    });
  } catch (e) {
    console.error("[ai] DB remember error:", e);
  }
}

export async function clearMemory(userId: number, mode: string) {
  try {
    const existing = await db.select().from(conversationsTable)
      .where(and(eq(conversationsTable.userId, userId), eq(conversationsTable.mode, mode)))
      .limit(1);
    if (existing.length > 0) {
      await db.delete(messagesTable)
        .where(eq(messagesTable.conversationId, existing[0].id));
      await db.delete(conversationsTable).where(eq(conversationsTable.id, existing[0].id));
    }
  } catch (e) {
    console.error("[ai] DB clearMemory error:", e);
  }
}

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


// ── SPRINT 1: Memory Bridge — history truncation + contamination filter ──

function filterContamination(history: ChatMsg[]): ChatMsg[] {
  const shellCmdRe = /^(cd |grep |wc |find |ls |cat |head |tail |pm2 |ssh |scp |sudo |pnpm |npm |git )/;

  return history.map(msg => {
    if (msg.role !== "assistant") return msg;
    // Check if message contains execution commands as main content
    const lines = msg.content.split("\n").filter(l => l.trim());
    const cmdLineCount = lines.filter(l => shellCmdRe.test(l.trim())).length;
    // If >30% of lines are shell commands, this is likely contamination
    if (cmdLineCount > 0 && cmdLineCount / Math.max(lines.length, 1) > 0.3) {
      return { ...msg, content: "[content filtered — contamination detected]" };
    }
    // Strip DSML fragments from history
    if (typeof msg.content === "string" && /<｜｜DSML｜｜/i.test(msg.content)) {
      return { ...msg, content: stripDSML(msg.content) };
    }
    return msg;
  });
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
