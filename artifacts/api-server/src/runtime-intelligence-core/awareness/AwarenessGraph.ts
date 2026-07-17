import type { AwarenessSignal, AwarenessGraph, AwarenessGraphNode, AwarenessGraphEdge } from './AwarenessTypes';

const SIGNAL_CATEGORY_CHAIN: Record<string, string[]> = {
  cash: ['liquidity'],
  margin: ['profitability'],
  stock: ['inventory_risk'],
  satisfaction: ['customer_risk'],
  workload: ['operations_pressure'],
  failed: ['execution_risk'],
  status: ['runtime_risk'],
};

const CATEGORY_LABELS: Record<string, string> = {
  liquidity: 'Liquidity Risk',
  profitability: 'Profitability Risk',
  inventory_risk: 'Inventory Risk',
  customer_risk: 'Customer Risk',
  operations_pressure: 'Operations Pressure',
  execution_risk: 'Execution Risk',
  runtime_risk: 'Runtime Risk',
};

export class AwarenessGraphBuilder {
  build(signals: AwarenessSignal[]): AwarenessGraph {
    const nodes: AwarenessGraphNode[] = [];
    const edges: AwarenessGraphEdge[] = [];
    const signalMap = new Map(signals.map(s => [s.id, s]));

    for (const signal of signals) {
      nodes.push({
        id: signal.id,
        label: `${signal.label}: ${signal.value}`,
        type: 'signal',
        severity: signal.priority === 'critical' ? 'high' : signal.priority === 'high' ? 'medium' : 'low',
      });

      const riskTypes = SIGNAL_CATEGORY_CHAIN[signal.category];
      if (riskTypes) {
        for (let i = 0; i < riskTypes.length; i++) {
          const riskId = `risk-${riskTypes[i]}`;
          const existing = nodes.find(n => n.id === riskId);
          if (!existing) {
            nodes.push({
              id: riskId,
              label: CATEGORY_LABELS[riskTypes[i]] || riskTypes[i],
              type: 'risk',
              severity: signal.priority === 'critical' ? 'high' : 'medium',
            });
          }
          edges.push({
            from: i === 0 ? signal.id : `risk-${riskTypes[i - 1]}`,
            to: riskId,
            type: 'causes',
          });
        }
      }
    }

    const criticalIds = signals.filter(s => s.severity === 'critical').map(s => s.id);
    if (criticalIds.length > 1) {
      for (let i = 0; i < criticalIds.length - 1; i++) {
        edges.push({
          from: criticalIds[i],
          to: criticalIds[i + 1],
          type: 'correlates',
        });
      }
    }

    return { nodes, edges };
  }

  toText(graph: AwarenessGraph): string {
    if (graph.nodes.length === 0) return 'No signals';
    const pairs = graph.edges.map(e => {
      const from = graph.nodes.find(n => n.id === e.from)?.label || e.from;
      const to = graph.nodes.find(n => n.id === e.to)?.label || e.to;
      return `${from} → (${e.type}) → ${to}`;
    });
    return pairs.join('\n');
  }
}
