/**
 * Inventory Event Subscriber
 *
 * ERP-INT-01 — Phase B+C: Polls event_store for inventory events,
 * calls consumeInventoryEvent(), and ensures idempotency.
 *
 * Architecture:
 *   Movement Engine → event_store → [this subscriber] → Finance consumer → Journal
 *
 * Idempotency: Checks if a transaction with referenceType + referenceId already exists
 */

import { db, eventStoreTable, transactionsTable } from "@workspace/db";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { consumeInventoryEvent } from "./inventoryEventConsumer";

const POLL_INTERVAL_MS = 2000; // 2 seconds
const BATCH_SIZE = 50;

let isRunning = false;
let lastSequence = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Load the last processed sequence from finance_transactions reference
 * (more accurate than event_store sequence — survives restarts)
 */
async function loadLastSequence(): Promise<number> {
  const [row] = await db
    .select({ seq: sql<number>`COALESCE(MAX(es.sequence), 0)` })
    .from(eventStoreTable)
    .innerJoin(transactionsTable, sql`${transactionsTable.referenceType} = ${eventStoreTable.eventType} AND ${transactionsTable.referenceId}::text = (${eventStoreTable.data}::json->>'stockCardId')`)
    .where(
      and(
        sql`${eventStoreTable.eventType} LIKE 'inventory.%'`,
        eq(transactionsTable.sourceModule, 'inventory'),
      ),
    );
  return row?.seq || 0;
}

/**
 * Check if an event has already been processed (idempotency check)
 */
async function isEventProcessed(eventType: string, referenceId: number): Promise<boolean> {
  const [existing] = await db
    .select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(
      and(
        eq(transactionsTable.referenceType, eventType),
        eq(transactionsTable.referenceId, referenceId),
        eq(transactionsTable.sourceModule, "inventory"),
      ),
    )
    .limit(1);
  return !!existing;
}

/**
 * Process a single inventory event
 */
async function processEvent(event: { sequence: number; eventType: string; data: any }): Promise<void> {
  // Idempotency: skip if already processed
  const data = typeof event.data === "object" ? event.data : (typeof event.data === "string" ? JSON.parse(event.data) : {});
  const stockCardId = data.stockCardId;
  
  if (stockCardId && (await isEventProcessed(event.eventType, stockCardId))) {
    return; // Already processed
  }

  const result = await consumeInventoryEvent(event);
  if (!result.consumed && result.error) {
    console.error(`[InventoryEventSubscriber] Failed to consume event #${event.sequence} (${event.eventType}): ${result.error}`);
  }
}

/**
 * Poll for new inventory events
 */
async function poll(): Promise<void> {
  if (isRunning) return;
  isRunning = true;

  try {
    const events = await db
      .select()
      .from(eventStoreTable)
      .where(
        and(
          sql`${eventStoreTable.eventType} LIKE 'inventory.%'`,
          gte(eventStoreTable.sequence, lastSequence + 1),
        ),
      )
      .orderBy(eventStoreTable.sequence)
      .limit(BATCH_SIZE);

    for (const event of events) {
      await processEvent({
        sequence: event.sequence,
        eventType: event.eventType,
        data: event.data,
      });
      lastSequence = event.sequence;
    }

    if (events.length > 0) {
      console.log(`[InventoryEventSubscriber] Processed ${events.length} events (seq ${lastSequence})`);
    }
  } catch (err) {
    console.error("[InventoryEventSubscriber] Poll error:", err);
  } finally {
    isRunning = false;
  }
}

/**
 * Process ALL inventory events from a given sequence (for replay)
 */
export async function processEventsFrom(fromSequence: number, onProgress?: (processed: number, total: number) => void): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  let hasMore = true;

  while (hasMore) {
    const events = await db
      .select()
      .from(eventStoreTable)
      .where(
        and(
          sql`${eventStoreTable.eventType} LIKE 'inventory.%'`,
          gte(eventStoreTable.sequence, fromSequence),
        ),
      )
      .orderBy(eventStoreTable.sequence)
      .limit(BATCH_SIZE);

    if (events.length === 0) {
      hasMore = false;
      break;
    }

    for (const event of events) {
      try {
        await processEvent({
          sequence: event.sequence,
          eventType: event.eventType,
          data: event.data,
        });
        processed++;
      } catch {
        failed++;
      }
      fromSequence = event.sequence + 1;
    }

    if (onProgress) onProgress(processed, -1);
  }

  return { processed, failed };
}

/**
 * Start the subscriber (polling loop)
 */
export async function startSubscriber(): Promise<void> {
  lastSequence = await loadLastSequence();
  console.log(`[InventoryEventSubscriber] Starting from sequence ${lastSequence}`);

  // Poll immediately, then every POLL_INTERVAL_MS
  await poll();
  intervalId = setInterval(poll, POLL_INTERVAL_MS);

  console.log(`[InventoryEventSubscriber] Active — polling every ${POLL_INTERVAL_MS}ms`);
}

/**
 * Stop the subscriber
 */
export function stopSubscriber(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  console.log("[InventoryEventSubscriber] Stopped");
}

// Getter for last sequence (for health/replay)
export function getLastProcessedSequence(): number {
  return lastSequence;
}
