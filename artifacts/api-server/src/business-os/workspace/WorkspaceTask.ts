import type { Task } from "./WorkspaceTypes";

let counter = 0;

function nextId(): string {
  counter++;
  return `task-${Date.now()}-${counter}`;
}

export function createTask(
  executive: string,
  title: string,
  description: string,
  priority: Task["priority"] = "normal",
  relatedEventId?: string,
  relatedObjectiveId?: string,
  autoCreated: boolean = false,
): Task {
  return {
    id: nextId(),
    executive,
    title,
    description,
    status: "pending",
    priority,
    relatedEventId,
    relatedObjectiveId,
    autoCreated,
    createdAt: new Date().toISOString(),
  };
}

export function completeTask(task: Task): Task {
  return { ...task, status: "completed", completedAt: new Date().toISOString() };
}

export function cancelTask(task: Task): Task {
  return { ...task, status: "cancelled", completedAt: new Date().toISOString() };
}

export function startTask(task: Task): Task {
  return { ...task, status: "in_progress" };
}

export function generateTasksFromEvent(eventType: string, data: Record<string, unknown>, branchId: number): Omit<Task, "id" | "createdAt">[] {
  const now = new Date().toISOString();
  switch (eventType) {
    case "stock.low":
      return [{ executive: "COO", title: `Restock ${data.itemName}`, description: `Stok ${data.itemName} menipis (${data.currentStock}/${data.minStock}) di branch ${branchId}`, status: "pending" as const, priority: "high" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "stock.out":
      return [{ executive: "COO", title: `Urgent: Stok ${data.itemName} habis`, description: `Stok ${data.itemName} habis di branch ${branchId} — perlu restock segera`, status: "pending" as const, priority: "critical" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "supplier.overdue":
      return [{ executive: "COO", title: `Follow up supplier ${data.supplierId}`, description: `Supplier ${data.supplierId} telat ${data.daysOverdue} hari untuk PO #${data.poId}`, status: "pending" as const, priority: "high" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "cash.low":
      return [{ executive: "CFO", title: `Review cash position`, description: `Kas menipis di branch ${branchId}: ${data.currentCash}`, status: "pending" as const, priority: "high" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "cash.negative":
      return [{ executive: "CFO", title: `Urgent: Kas negatif!`, description: `Kas negatif ${data.currentCash} di branch ${branchId} — immediate action required`, status: "pending" as const, priority: "critical" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "shift.discrepancy":
      return [{ executive: "COO", title: `Investigate shift discrepancy`, description: `Selisih shift ${data.difference} di branch ${branchId}`, status: "pending" as const, priority: "high" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "production.failed":
      return [{ executive: "COO", title: `Handle production failure`, description: `Produksi produk ${data.productId} gagal: ${data.reason}`, status: "pending" as const, priority: "high" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "employee.absent":
      return [{ executive: "CHRO", title: `Follow up absentee: ${data.employeeName}`, description: `${data.employeeName} tidak hadir shift ${data.shiftId}`, status: "pending" as const, priority: "warning" as any, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "branch.offline":
      return [{ executive: "CTO", title: `Check branch ${branchId} offline`, description: `Cabang ${branchId} offline sejak ${data.lastSeen}`, status: "pending" as const, priority: "high" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    case "journal.failed":
      return [{ executive: "CFO", title: `Fix journal #${data.journalId}`, description: `Jurnal gagal diposting: ${data.reason}`, status: "pending" as const, priority: "high" as const, relatedEventId: eventType, autoCreated: true, completedAt: undefined }];
    default:
      return [];
  }
}
