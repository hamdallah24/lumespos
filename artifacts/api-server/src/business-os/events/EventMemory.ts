import type { EventEnvelope } from "./EventEnvelope";
import { EventPriority } from "./EventPriority";
import { memoryProvider } from "../../executive-runtime/memory-provider";
import { KnowledgeProvider } from "../../knowledge-platform/providers";

const EVENT_MEMORY_THRESHOLDS: Record<EventPriority, { writeMemory: boolean; ingestKnowledge: boolean }> = {
  [EventPriority.INFO]: { writeMemory: false, ingestKnowledge: false },
  [EventPriority.WARNING]: { writeMemory: true, ingestKnowledge: false },
  [EventPriority.HIGH]: { writeMemory: true, ingestKnowledge: true },
  [EventPriority.CRITICAL]: { writeMemory: true, ingestKnowledge: true },
};

function getDomain(event: EventEnvelope): string {
  const type = event.type;
  if (type.startsWith("stock.") || type.startsWith("inventory.")) return "inventory";
  if (type.startsWith("purchase.") || type.startsWith("supplier.")) return "purchasing";
  if (type.startsWith("shift.")) return "operations";
  if (type.startsWith("cash.") || type.startsWith("finance.") || type.startsWith("expense.") || type.startsWith("journal.")) return "finance";
  if (type.startsWith("employee.")) return "hr";
  if (type.startsWith("production.")) return "production";
  if (type.startsWith("product.") || type.startsWith("price.") || type.startsWith("recipe.")) return "product";
  if (type.startsWith("ingredient.")) return "production";
  if (type.startsWith("branch.")) return "operations";
  if (type.startsWith("po.")) return "purchasing";
  if (type.startsWith("price.")) return "product";
  return "general";
}

function getTopic(event: EventEnvelope): string {
  const parts = event.type.split(".");
  return parts.length >= 2 ? parts.slice(0, 2).join("_") : event.type;
}

export function feedEvent(event: EventEnvelope): void {
  const config = EVENT_MEMORY_THRESHOLDS[event.priority];
  if (!config) return;

  if (config.writeMemory) {
    writeToMemory(event).catch((err) => {
      console.error(`[EventMemory] Write to memory failed: ${err.message}`);
    });
  }

  if (config.ingestKnowledge) {
    ingestToKnowledge(event).catch((err) => {
      console.error(`[EventMemory] Ingest to knowledge failed: ${err.message}`);
    });
  }
}

async function writeToMemory(event: EventEnvelope): Promise<void> {
  const summary = summarizeEvent(event);
  await memoryProvider.write({
    content: summary,
    executive: "system",
    category: "event",
    scope: "project",
    source: `event:${event.type}`,
    tags: [event.type, event.aggregateType, `branch:${event.branchId}`, event.priority.toLowerCase()],
    confidence: 0.9,
    executivePriority: event.priority === EventPriority.CRITICAL ? 3 : event.priority === EventPriority.HIGH ? 2 : 1,
  });
}

async function ingestToKnowledge(event: EventEnvelope): Promise<void> {
  const summary = summarizeEvent(event);
  KnowledgeProvider.ingestEpisode({
    eventType: event.type,
    eventId: event.id,
    context: JSON.stringify(event.data).slice(0, 500),
    outcome: "neutral",
    domain: getDomain(event),
    topic: getTopic(event),
    summary,
    tags: [event.type, event.aggregateType, `branch:${event.branchId}`, event.priority.toLowerCase()],
  });
}

function summarizeEvent(event: EventEnvelope): string {
  const data = event.data;
  switch (event.type) {
    case "stock.low":
      return `Stok ${data.itemName} menipis: ${data.currentStock}/${data.minStock} di cabang ${event.branchId}`;
    case "stock.out":
      return `Stok ${data.itemName} HABIS di cabang ${event.branchId}`;
    case "stock.loss_corrected":
      return `Selisih stok: ${data.itemName} -${data.qty} karena ${data.reason}`;
    case "cash.low":
      return `Kas menipis: Rp${Number(data.currentCash).toLocaleString("id-ID")} (min: Rp${Number(data.minimumCash).toLocaleString("id-ID")})`;
    case "cash.negative":
      return `KAS NEGATIF: Rp${Number(data.currentCash).toLocaleString("id-ID")} di cabang ${event.branchId}`;
    case "shift.discrepancy":
      return `Selisih shift: expected Rp${Number(data.expected).toLocaleString("id-ID")}, actual Rp${Number(data.actual).toLocaleString("id-ID")}, selisih Rp${Number(data.difference).toLocaleString("id-ID")}`;
    case "supplier.overdue":
      return `Supplier ${data.supplierId} telat ${data.daysOverdue} hari (PO #${data.poId})`;
    case "production.failed":
      return `Produksi gagal: batch ${data.batchId}, produk ${data.productId} — ${data.reason}`;
    case "branch.offline":
      return `Cabang ${event.branchId} offline sejak ${data.lastSeen}`;
    case "journal.failed":
      return `Jurnal #${data.journalId} gagal: ${data.reason}`;
    case "employee.absent":
      return `Karyawan ${data.employeeName} tidak hadir shift ${data.shiftId}`;
    case "price.updated":
      return `Harga produk ${data.productId} berubah: Rp${Number(data.beforePrice).toLocaleString("id-ID")} → Rp${Number(data.afterPrice).toLocaleString("id-ID")}`;
    case "product.deactivated":
      return `Produk ${data.productId} dinonaktifkan`;
    case "recipe.updated":
      return `Resep produk ${data.productId} diubah oleh user ${data.userId}`;
    case "purchase.received":
      return `PO #${data.poId} diterima — ${Array.isArray(data.receivedItems) ? data.receivedItems.length : 0} items`;
    default:
      return `Event ${event.type}: ${JSON.stringify(data).slice(0, 200)} di cabang ${event.branchId}`;
  }
}

export async function batchFeedEvents(events: EventEnvelope[]): Promise<void> {
  for (const event of events) {
    feedEvent(event);
  }
}
