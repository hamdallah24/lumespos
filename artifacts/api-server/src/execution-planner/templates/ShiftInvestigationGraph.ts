import type { ExecutionGraph } from "../core/types";

export function createShiftInvestigationGraph(branchId?: number): ExecutionGraph {
  const nodes = [
    { id: "si-1", label: "Kumpulkan data shift yang bermasalah", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: [] as string[], metadata: {} },
    { id: "si-2", label: "Interview kasir yang bertugas", type: "task" as const, status: "pending" as const, estimatedDuration: 30, dependsOn: ["si-1"], metadata: {} },
    { id: "si-3", label: "Rekonsiliasi transaksi vs kas aktual", type: "task" as const, status: "pending" as const, estimatedDuration: 25, dependsOn: ["si-1"], metadata: {} },
    { id: "si-4", label: "Identifikasi sumber selisih", type: "decision" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["si-2", "si-3"], metadata: {} },
    { id: "si-5", label: "Buat laporan investigasi", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: ["si-4"], metadata: {} },
    { id: "si-6", label: "Rekomendasi tindakan perbaikan", type: "notification" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: ["si-5"], metadata: {} },
  ];
  const edges = nodes.filter(n => n.dependsOn.length > 0).flatMap(n =>
    n.dependsOn.map(d => ({ id: `e-${d}-${n.id}`, fromNodeId: d, toNodeId: n.id, type: "dependency" as const, metadata: {} }))
  );
  return { id: `shift-investigation-${Date.now()}`, name: "Shift Investigation", nodes, edges, metadata: { template: "ShiftInvestigationGraph" }, createdAt: new Date(), branchId };
}
