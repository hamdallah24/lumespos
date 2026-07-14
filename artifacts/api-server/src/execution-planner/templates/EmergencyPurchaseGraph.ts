import type { ExecutionGraph } from "../core/types";

export function createEmergencyPurchaseGraph(branchId?: number): ExecutionGraph {
  const nodes = [
    { id: "ep-1", label: "Identifikasi item kritis (coverage < 1 hari)", type: "task" as const, status: "pending" as const, estimatedDuration: 5, dependsOn: [] as string[], metadata: {} },
    { id: "ep-2", label: "Cari supplier dengan stok tersedia", type: "task" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["ep-1"], metadata: {} },
    { id: "ep-3", label: "Approval pembelian darurat oleh COO", type: "approval" as const, status: "pending" as const, estimatedDuration: 30, dependsOn: ["ep-2"], metadata: {} },
    { id: "ep-4", label: "Buat purchase order", type: "task" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: ["ep-3"], metadata: {} },
    { id: "ep-5", label: "Proses penerimaan barang", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: ["ep-4"], metadata: {} },
    { id: "ep-6", label: "Update stok dan rata-rata harga", type: "task" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: ["ep-5"], metadata: {} },
  ];
  const edges = nodes.filter(n => n.dependsOn.length > 0).flatMap(n =>
    n.dependsOn.map(d => ({ id: `e-${d}-${n.id}`, fromNodeId: d, toNodeId: n.id, type: "dependency" as const, metadata: {} }))
  );
  return { id: `emergency-purchase-${Date.now()}`, name: "Emergency Purchase", nodes, edges, metadata: { template: "EmergencyPurchaseGraph" }, createdAt: new Date(), branchId };
}
