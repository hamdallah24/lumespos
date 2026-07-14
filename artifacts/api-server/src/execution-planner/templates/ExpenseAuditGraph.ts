import type { ExecutionGraph } from "../core/types";

export function createExpenseAuditGraph(branchId?: number): ExecutionGraph {
  const nodes = [
    { id: "ea-1", label: "Kumpulkan data pengeluaran 7 hari terakhir", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: [] as string[], metadata: {} },
    { id: "ea-2", label: "Kategorikan setiap pengeluaran", type: "task" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["ea-1"], metadata: {} },
    { id: "ea-3", label: "Identifikasi pengeluaran tidak wajar", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: ["ea-2"], metadata: {} },
    { id: "ea-4", label: "Review dengan manajer cabang", type: "decision" as const, status: "pending" as const, estimatedDuration: 30, dependsOn: ["ea-3"], metadata: {} },
    { id: "ea-5", label: "Buat rekomendasi penghematan", type: "task" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["ea-4"], metadata: {} },
    { id: "ea-6", label: "Laporan hasil audit", type: "notification" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: ["ea-5"], metadata: {} },
  ];
  const edges = nodes.filter(n => n.dependsOn.length > 0).flatMap(n =>
    n.dependsOn.map(d => ({ id: `e-${d}-${n.id}`, fromNodeId: d, toNodeId: n.id, type: "dependency" as const, metadata: {} }))
  );
  return { id: `expense-audit-${Date.now()}`, name: "Expense Audit", nodes, edges, metadata: { template: "ExpenseAuditGraph" }, createdAt: new Date(), branchId };
}
