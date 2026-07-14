import type { ExecutionGraph } from "../core/types";

export function createCashDiscrepancyGraph(branchId?: number): ExecutionGraph {
  const nodes = [
    { id: "cd-1", label: "Hitung total selisih kas per shift", type: "task" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: [] as string[], metadata: {} },
    { id: "cd-2", label: "Verifikasi ulang semua transaksi tunai", type: "task" as const, status: "pending" as const, estimatedDuration: 30, dependsOn: ["cd-1"], metadata: {} },
    { id: "cd-3", label: "Cek log audit sistem", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: ["cd-1"], metadata: {} },
    { id: "cd-4", label: "Tentukan penyebab selisih", type: "decision" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["cd-2", "cd-3"], metadata: {} },
    { id: "cd-5", label: "Buat adjustment jika diperlukan", type: "task" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: ["cd-4"], metadata: {} },
    { id: "cd-6", label: "Laporan dan rekomendasi pencegahan", type: "notification" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: ["cd-5"], metadata: {} },
  ];
  const edges = nodes.filter(n => n.dependsOn.length > 0).flatMap(n =>
    n.dependsOn.map(d => ({ id: `e-${d}-${n.id}`, fromNodeId: d, toNodeId: n.id, type: "dependency" as const, metadata: {} }))
  );
  return { id: `cash-discrepancy-${Date.now()}`, name: "Cash Discrepancy", nodes, edges, metadata: { template: "CashDiscrepancyGraph" }, createdAt: new Date(), branchId };
}
