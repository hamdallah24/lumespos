import { EventPriority } from "./EventPriority";

export interface EventSchema {
  type: string;
  version: number;
  priority: EventPriority;
  description: string;
  requiredFields: string[];
  aggregateType: string;
}

const REGISTRY = new Map<string, EventSchema>();

function register(schema: EventSchema): void {
  if (REGISTRY.has(schema.type)) {
    console.warn(`[EventRegistry] Overwriting schema for event type: ${schema.type}`);
  }
  REGISTRY.set(schema.type, schema);
}

function get(type: string): EventSchema | undefined {
  return REGISTRY.get(type);
}

function getAll(): EventSchema[] {
  return Array.from(REGISTRY.values());
}

function validate(type: string, version: number, data: Record<string, unknown>): { valid: boolean; error?: string } {
  const schema = REGISTRY.get(type);
  if (!schema) return { valid: false, error: `Unknown event type: ${type}` };
  if (schema.version !== version) return { valid: false, error: `Version mismatch for ${type}: expected ${schema.version}, got ${version}` };

  const missing = schema.requiredFields.filter(f => data[f] === undefined || data[f] === null);
  if (missing.length > 0) {
    return { valid: false, error: `Missing required fields for ${type}: ${missing.join(", ")}` };
  }

  return { valid: true };
}

function getPriority(type: string): EventPriority {
  return REGISTRY.get(type)?.priority ?? EventPriority.INFO;
}

// ===== REGISTER ALL BUSINESS EVENTS =====

register({ type: "stock.low", version: 1, priority: EventPriority.HIGH, description: "Stok barang di bawah minimum", requiredFields: ["itemName", "currentStock", "minStock"], aggregateType: "inventory" });
register({ type: "stock.out", version: 1, priority: EventPriority.CRITICAL, description: "Stok barang habis", requiredFields: ["itemName", "branchId"], aggregateType: "inventory" });
register({ type: "stock.adjusted", version: 1, priority: EventPriority.INFO, description: "Stok disesuaikan secara manual", requiredFields: ["itemName", "qty", "userId"], aggregateType: "inventory" });
register({ type: "stock.added", version: 1, priority: EventPriority.INFO, description: "Stok masuk", requiredFields: ["itemName", "qty", "branchId"], aggregateType: "inventory" });
register({ type: "stock.reduced", version: 1, priority: EventPriority.INFO, description: "Stok keluar", requiredFields: ["itemName", "qty", "branchId"], aggregateType: "inventory" });
register({ type: "stock.corrected", version: 1, priority: EventPriority.WARNING, description: "Stok dikoreksi", requiredFields: ["itemName", "qty", "branchId"], aggregateType: "inventory" });
register({ type: "stock.loss_corrected", version: 1, priority: EventPriority.HIGH, description: "Selisih stok (loss)", requiredFields: ["itemName", "qty", "reason"], aggregateType: "inventory" });
register({ type: "stock.transferred", version: 1, priority: EventPriority.INFO, description: "Transfer stok antar cabang", requiredFields: ["itemName", "qty", "fromBranchId", "toBranchId"], aggregateType: "inventory" });

register({ type: "purchase.created", version: 1, priority: EventPriority.INFO, description: "Purchase order dibuat", requiredFields: ["poId", "supplierId"], aggregateType: "purchase_order" });
register({ type: "purchase.received", version: 1, priority: EventPriority.WARNING, description: "Barang PO diterima", requiredFields: ["poId", "receivedItems"], aggregateType: "purchase_order" });
register({ type: "supplier.overdue", version: 1, priority: EventPriority.HIGH, description: "Supplier telat kirim", requiredFields: ["supplierId", "poId", "daysOverdue"], aggregateType: "supplier" });

register({ type: "shift.closed", version: 1, priority: EventPriority.INFO, description: "Shift ditutup", requiredFields: ["shiftId", "branchId"], aggregateType: "shift" });
register({ type: "shift.discrepancy", version: 1, priority: EventPriority.HIGH, description: "Selisih shift", requiredFields: ["shiftId", "expected", "actual", "difference"], aggregateType: "shift" });

register({ type: "expense.recorded", version: 1, priority: EventPriority.INFO, description: "Biaya dicatat", requiredFields: ["expenseId", "amount", "description"], aggregateType: "expense" });
register({ type: "cash.low", version: 1, priority: EventPriority.HIGH, description: "Kas menipis", requiredFields: ["currentCash", "minimumCash"], aggregateType: "finance" });
register({ type: "cash.negative", version: 1, priority: EventPriority.CRITICAL, description: "Kas negatif", requiredFields: ["currentCash", "branchId"], aggregateType: "finance" });
register({ type: "finance.period.close", version: 1, priority: EventPriority.WARNING, description: "Periode akuntansi akan ditutup", requiredFields: ["period", "deadline"], aggregateType: "finance" });
register({ type: "journal.failed", version: 1, priority: EventPriority.HIGH, description: "Jurnal gagal diposting", requiredFields: ["journalId", "reason"], aggregateType: "finance" });

register({ type: "employee.absent", version: 1, priority: EventPriority.WARNING, description: "Karyawan tidak hadir", requiredFields: ["employeeId", "employeeName", "shiftId"], aggregateType: "employee" });
register({ type: "employee.leave", version: 1, priority: EventPriority.INFO, description: "Karyawan izin/cuti", requiredFields: ["employeeId", "employeeName", "leaveType"], aggregateType: "employee" });

register({ type: "production.failed", version: 1, priority: EventPriority.HIGH, description: "Produksi gagal", requiredFields: ["batchId", "productId", "reason"], aggregateType: "production" });
register({ type: "production.completed", version: 1, priority: EventPriority.INFO, description: "Produksi selesai", requiredFields: ["batchId", "productId", "qty"], aggregateType: "production" });
register({ type: "production.finished", version: 1, priority: EventPriority.INFO, description: "Batch produksi selesai", requiredFields: ["productId", "qty"], aggregateType: "production" });

register({ type: "product.created", version: 1, priority: EventPriority.INFO, description: "Produk baru ditambahkan", requiredFields: ["productId", "name"], aggregateType: "product" });
register({ type: "price.updated", version: 1, priority: EventPriority.WARNING, description: "Harga produk berubah", requiredFields: ["productId", "beforePrice", "afterPrice"], aggregateType: "product" });
register({ type: "product.deactivated", version: 1, priority: EventPriority.WARNING, description: "Produk dinonaktifkan", requiredFields: ["productId"], aggregateType: "product" });
register({ type: "recipe.updated", version: 1, priority: EventPriority.WARNING, description: "Resep produk berubah", requiredFields: ["productId", "userId"], aggregateType: "recipe" });
register({ type: "recipe.created", version: 1, priority: EventPriority.INFO, description: "Resep baru ditambahkan", requiredFields: ["productId"], aggregateType: "recipe" });

register({ type: "ingredient.created", version: 1, priority: EventPriority.INFO, description: "Bahan baku baru", requiredFields: ["ingredientId", "name"], aggregateType: "ingredient" });

register({ type: "branch.offline", version: 1, priority: EventPriority.HIGH, description: "Cabang offline", requiredFields: ["branchId", "lastSeen"], aggregateType: "branch" });
register({ type: "branch.online", version: 1, priority: EventPriority.INFO, description: "Cabang kembali online", requiredFields: ["branchId"], aggregateType: "branch" });

register({ type: "po.created", version: 1, priority: EventPriority.INFO, description: "Purchase order via execution layer", requiredFields: ["poId", "supplierId", "total"], aggregateType: "purchase_order" });

export const ExecutiveEventRegistry = { register, get, getAll, validate, getPriority };
