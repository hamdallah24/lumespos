import type { ExecutionGraph } from "../core/types";

export function createPriceReviewGraph(branchId?: number): ExecutionGraph {
  const nodes = [
    { id: "pr-1", label: "Analisis margin produk per varian", type: "task" as const, status: "pending" as const, estimatedDuration: 20, dependsOn: [] as string[], metadata: {} },
    { id: "pr-2", label: "Bandingkan harga dengan kompetitor", type: "task" as const, status: "pending" as const, estimatedDuration: 25, dependsOn: ["pr-1"], metadata: {} },
    { id: "pr-3", label: "Hitung harga optimal (cost+margin)", type: "task" as const, status: "pending" as const, estimatedDuration: 15, dependsOn: ["pr-2"], metadata: {} },
    { id: "pr-4", label: "Approval perubahan harga oleh CEO", type: "approval" as const, status: "pending" as const, estimatedDuration: 120, dependsOn: ["pr-3"], metadata: {} },
    { id: "pr-5", label: "Update harga di sistem", type: "task" as const, status: "pending" as const, estimatedDuration: 10, dependsOn: ["pr-4"], metadata: {} },
    { id: "pr-6", label: "Notifikasi perubahan ke tim operasional", type: "notification" as const, status: "pending" as const, estimatedDuration: 5, dependsOn: ["pr-5"], metadata: {} },
  ];
  const edges = nodes.filter(n => n.dependsOn.length > 0).flatMap(n =>
    n.dependsOn.map(d => ({ id: `e-${d}-${n.id}`, fromNodeId: d, toNodeId: n.id, type: "dependency" as const, metadata: {} }))
  );
  return { id: `price-review-${Date.now()}`, name: "Price Review", nodes, edges, metadata: { template: "PriceReviewGraph" }, createdAt: new Date(), branchId };
}
