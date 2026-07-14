// Fix Pack A: AI Memory Service — Single owner of conversation persistence
// All DB operations for conversation memory live here.
// No route, no runtime, no adapter, no governor touches the DB directly.

import { db, conversationsTable, messagesTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { redisService } from "../lib/redis";

type ChatMsg = { role: "user" | "assistant"; content: string };
const MAX_MEMORY = 10;
const CACHE_TTL = 300; // 5 minutes

function historyCacheKey(userId: number, mode: string): string {
  return `memory:history:${userId}:${mode}`;
}

export async function getOrCreateConversation(userId: number, mode: string): Promise<number> {
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
    // Try Redis cache first
    const cacheKey = historyCacheKey(userId, mode);
    if (redisService.initialized) {
      const cached = await redisService.cache.get<ChatMsg[]>(cacheKey);
      if (cached) return cached;
    }

    const convId = await getOrCreateConversation(userId, mode);
    const rows = await db.select().from(messagesTable)
      .where(eq(messagesTable.conversationId, convId))
      .orderBy(messagesTable.id)
      .limit(MAX_MEMORY * 2);
    const history = rows.map(r => ({
      role: r.role as "user" | "assistant",
      content: maxContentLength && r.content.length > maxContentLength
        ? r.content.slice(0, maxContentLength) + "…"
        : r.content,
    }));

    // Cache in Redis
    if (redisService.initialized) {
      redisService.cache.set(cacheKey, history, CACHE_TTL);
    }

    return history;
  } catch (e) {
    console.error("[ai] DB getHistory error:", e);
    return [];
  }
}

export async function remember(userId: number, mode: string, userMsg: string, assistantReply: string) {
  try {
    const convId = await getOrCreateConversation(userId, mode);
    await db.transaction(async (tx) => {
      await tx.insert(messagesTable).values([
        { conversationId: convId, role: "user", content: userMsg.slice(0, 1000) },
        { conversationId: convId, role: "assistant", content: assistantReply.slice(0, 4000) },
      ]);
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

    // Invalidate cache so next getHistory fetches fresh data
    if (redisService.initialized) {
      redisService.cache.del(historyCacheKey(userId, mode));
    }
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

    // Clear cache
    if (redisService.initialized) {
      redisService.cache.del(historyCacheKey(userId, mode));
    }
  } catch (e) {
    console.error("[ai] DB clearMemory error:", e);
  }
}
