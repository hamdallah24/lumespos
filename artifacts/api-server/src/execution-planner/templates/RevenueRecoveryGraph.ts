import type { ExecutionGraph } from "../core/types";

export function createRevenueRecoveryGraph(branchId?: number): ExecutionGraph {
  const nodes = [
    { id: "rr-1", label: "Analisis penyebab penurunan revenue", type: "task" as const, status: "pending" as const, estimatedDuration: 30, dependsOn: [] as string[], metadata: {} },
    { id: "rr-2", label: "Review harga jual dan promo kompetitor", type: "task" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: ["rr-1"], metadata: {} },
    { id: "rr-3", label: "Buat rencana promo", type: "task" as const, status: "pending" as const, estimatedDuration: 25, dependsOn: ["rr-2"], metadata: {} },
    { id: "rr-4", label: "Approval promo oleh COO", type: "approval" as const, status: "pending" as const, estimatedDuration: 60, dependsOn: ["rr-3"], metadata: {} },
    { id: "rr-5", label: "Jalankan promo", type: "task" as const, status: "pending" as const, estimatedDuration: 120, dependsOn: ["rr-4"], metadata: {} },
    { id: "rr-6", label: "Monitor dampak promo terhadap revenue", type: "notification" as const, status: "pending" as const, estimatedDuration: 30, dependsOn: ["rr-5"], metadata: {} },
  ];
  const edges = nodes.filter(n => n.dependsOn.length > 0).flatMap(n =>
    n.dependsOn.map(d => ({ id: `e-${d}-${n.id}`, fromNodeId: d, toNodeId: n.id, type: "dependency" as const, metadata: {} }))
  );
  return { id: `revenue-recovery-${Date.now()}`, name: "Revenue Recovery", nodes, edges, metadata: { template: "RevenueRecoveryGraph" }, createdAt: new Date(), branchId };
}
