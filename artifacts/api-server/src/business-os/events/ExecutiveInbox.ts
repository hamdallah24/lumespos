import type { EventEnvelope } from "./EventEnvelope";
import { EventPriority, PRIORITY_ORDER } from "./EventPriority";

interface InboxEntry {
  event: EventEnvelope;
  receivedAt: Date;
  processed: boolean;
}

const MAX_INBOX_SIZE = 200;
const inboxes = new Map<string, InboxEntry[]>();

export function push(executive: string, event: EventEnvelope): void {
  if (!inboxes.has(executive)) inboxes.set(executive, []);
  const inbox = inboxes.get(executive)!;

  inbox.push({ event, receivedAt: new Date(), processed: false });

  if (inbox.length > MAX_INBOX_SIZE) {
    inbox.sort((a, b) => PRIORITY_ORDER[a.event.priority] - PRIORITY_ORDER[b.event.priority]);
    inbox.splice(MAX_INBOX_SIZE);
  }
}

export function pop(executive: string, count: number = 10): EventEnvelope[] {
  const inbox = inboxes.get(executive);
  if (!inbox || inbox.length === 0) return [];

  inbox.sort((a, b) => {
    const pDelta = PRIORITY_ORDER[b.event.priority] - PRIORITY_ORDER[a.event.priority];
    if (pDelta !== 0) return pDelta;
    return a.receivedAt.getTime() - b.receivedAt.getTime();
  });

  const toProcess = inbox.splice(0, count);
  for (const entry of toProcess) entry.processed = true;
  return toProcess.map(e => e.event);
}

export function peek(executive: string, count: number = 5): EventEnvelope[] {
  const inbox = inboxes.get(executive);
  if (!inbox) return [];
  return inbox.slice(0, count).map(e => e.event);
}

export function size(executive: string): number {
  return inboxes.get(executive)?.length ?? 0;
}

export function totalUnprocessed(): number {
  let total = 0;
  for (const [, inbox] of inboxes) total += inbox.length;
  return total;
}

export function getInboxExecutives(): string[] {
  return Array.from(inboxes.keys()).filter(e => (inboxes.get(e)?.length ?? 0) > 0);
}

export function getInboxStats(): { executive: string; unread: number }[] {
  return Array.from(inboxes.entries())
    .filter(([, inbox]) => inbox.length > 0)
    .map(([exec, inbox]) => ({ executive: exec, unread: inbox.length }))
    .sort((a, b) => b.unread - a.unread);
}

export function clear(executive: string): void {
  inboxes.delete(executive);
}

export function clearAll(): void {
  inboxes.clear();
}
