import type { ExecutionGraph } from "../core/types";

export function createYieldCorrectionGraph(branchId?: number): ExecutionGraph {
  const nodes = [
    { id: "yc-1", label: "Ukur yield aktual vs target", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: [] as string[], metadata: {} },
    { id: "yc-2", label: "Identifikasi titik waste dalam produksi", type: "task" as const, status: "pending" as const, estimatedDuration: 25, dependsOn: ["yc-1"], metadata: {} },
    { id: "yc-3", label: "Review resep dan prosedur produksi", type: "task" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["yc-2"], metadata: {} },
    { id: "yc-4", label: "Adjust resep atau metode produksi", type: "task" as const, status: "pending" as const, estimatedDuration: 30, dependsOn: ["yc-3"], metadata: {} },
    { id: "yc-5", label: "Uji coba produksi dengan metode baru", type: "task" as const, status: "pending" as const, estimatedDuration: 45, dependsOn: ["yc-4"], metadata: {} },
    { id: "yc-6", label: "Evaluasi hasil dan dokumentasi", type: "notification" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: ["yc-5"], metadata: {} },
  ];
  const edges = nodes.filter(n => n.dependsOn.length > 0).flatMap(n =>
    n.dependsOn.map(d => ({ id: `e-${d}-${n.id}`, fromNodeId: d, toNodeId: n.id, type: "dependency" as const, metadata: {} }))
  );
  return { id: `yield-correction-${Date.now()}`, name: "Yield Correction", nodes, edges, metadata: { template: "YieldCorrectionGraph" }, createdAt: new Date(), branchId };
}
