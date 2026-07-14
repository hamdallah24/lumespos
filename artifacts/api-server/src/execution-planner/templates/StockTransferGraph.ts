import type { ExecutionGraph } from "../core/types";

export function createStockTransferGraph(branchId?: number): ExecutionGraph {
  const nodes = [
    { id: "st-1", label: "Identifikasi stok berlebih di cabang sumber", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: [] as string[], metadata: {} },
    { id: "st-2", label: "Verifikasi ketersediaan stok", type: "task" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: ["st-1"], metadata: {} },
    { id: "st-3", label: "Otorisasi transfer oleh COO", type: "approval" as const, status: "pending" as const, estimatedDuration: 60, dependsOn: ["st-2"], metadata: {} },
    { id: "st-4", label: "Eksekusi transfer (pengurangan stok sumber)", type: "task" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["st-3"], metadata: {} },
    { id: "st-5", label: "Tambah stok di cabang tujuan", type: "task" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["st-4"], metadata: {} },
    { id: "st-6", label: "Konfirmasi penerimaan", type: "notification" as const, status: "pending" as const, estimatedDuration: 5, dependsOn: ["st-5"], metadata: {} },
  ];
  const edges = nodes.filter(n => n.dependsOn.length > 0).flatMap(n =>
    n.dependsOn.map(d => ({ id: `e-${d}-${n.id}`, fromNodeId: d, toNodeId: n.id, type: "dependency" as const, metadata: {} }))
  );
  return { id: `stock-transfer-${Date.now()}`, name: "Stock Transfer", nodes, edges, metadata: { template: "StockTransferGraph" }, createdAt: new Date(), branchId };
}
