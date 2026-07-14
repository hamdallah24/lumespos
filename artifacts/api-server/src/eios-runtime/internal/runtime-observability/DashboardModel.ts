export interface DashboardPanel {
  title: string;
  value: string | number;
  unit?: string;
  status?: "good" | "warning" | "critical";
  detail?: string;
}

export interface DashboardModel {
  timestamp: string;
  runtime: DashboardPanel[];
  registries: DashboardPanel[];
  pipeline: DashboardPanel[];
  governance: DashboardPanel[];
  resources: DashboardPanel[];
  missions?: DashboardPanel[];
  knowledge?: DashboardPanel[];
  tokens?: DashboardPanel[];
}

export const DashboardModelBuilder = {
  build(snapshot: {
    healthScore: number;
    registryCount: number;
    pipelineCount: number;
    governanceScore: number;
    memoryUsageMB: number;
    cpuUsage: number;
    activePipelines: number;
    queuedPipelines: number;
    uptimeSeconds: number;
    missionsRunning?: number;
    missionsCompleted?: number;
    missionsFailed?: number;
    knowledgeTotalCards?: number;
    knowledgeBestPractices?: number;
    tokensTodayTotal?: number;
    tokensAvgPerRequest?: number;
    tokensCompressionRate?: number;
  }): DashboardModel {
    const missionsPanels: DashboardPanel[] = [];
    if (snapshot.missionsRunning !== undefined) {
      missionsPanels.push(
        { title: "Running", value: snapshot.missionsRunning, status: snapshot.missionsRunning > 0 ? "warning" : "good" },
        { title: "Completed", value: snapshot.missionsCompleted ?? 0, status: "good" },
        { title: "Failed", value: snapshot.missionsFailed ?? 0, status: (snapshot.missionsFailed ?? 0) > 0 ? "critical" : "good" },
      );
    }
    const knowledgePanels: DashboardPanel[] = [];
    if (snapshot.knowledgeTotalCards !== undefined) {
      knowledgePanels.push(
        { title: "Total Cards", value: snapshot.knowledgeTotalCards, status: "good" },
        { title: "Best Practices", value: snapshot.knowledgeBestPractices ?? 0, status: "good" },
      );
    }
    const tokensPanels: DashboardPanel[] = [];
    if (snapshot.tokensTodayTotal !== undefined) {
      tokensPanels.push(
        { title: "Today Total", value: snapshot.tokensTodayTotal, unit: "tokens", status: "good" },
        { title: "Avg/Request", value: snapshot.tokensAvgPerRequest ?? 0, unit: "tokens", status: "good" },
        { title: "Compression", value: snapshot.tokensCompressionRate ?? 0, unit: "%", status: "good" },
      );
    }
    return {
      timestamp: new Date().toISOString(),
      runtime: [
        { title: "Health Score", value: snapshot.healthScore, unit: "%", status: snapshot.healthScore >= 90 ? "good" : snapshot.healthScore >= 70 ? "warning" : "critical" },
        { title: "Uptime", value: Math.floor(snapshot.uptimeSeconds / 3600), unit: "h", status: "good" },
        { title: "Active Pipelines", value: snapshot.activePipelines, status: snapshot.activePipelines < 50 ? "good" : "warning" },
        { title: "Queued Pipelines", value: snapshot.queuedPipelines, status: snapshot.queuedPipelines < 10 ? "good" : "warning" },
      ],
      registries: [
        { title: "Registry Count", value: snapshot.registryCount, status: "good" },
      ],
      pipeline: [
        { title: "Pipeline Throughput", value: snapshot.pipelineCount, unit: "/min", status: "good" },
      ],
      governance: [
        { title: "Governance Score", value: snapshot.governanceScore, unit: "%", status: snapshot.governanceScore >= 90 ? "good" : "warning" },
      ],
      resources: [
        { title: "Memory (RSS)", value: Math.round(snapshot.memoryUsageMB), unit: "MB", status: snapshot.memoryUsageMB < 512 ? "good" : snapshot.memoryUsageMB < 1024 ? "warning" : "critical" },
        { title: "CPU", value: Math.round(snapshot.cpuUsage), unit: "%", status: snapshot.cpuUsage < 70 ? "good" : snapshot.cpuUsage < 90 ? "warning" : "critical" },
      ],
      ...(missionsPanels.length > 0 ? { missions: missionsPanels } : {}),
      ...(knowledgePanels.length > 0 ? { knowledge: knowledgePanels } : {}),
      ...(tokensPanels.length > 0 ? { tokens: tokensPanels } : {}),
    };
  },
};
