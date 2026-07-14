// ECP-048: Organization Dashboard — delegates to EIOS DashboardModelBuilder
import { DashboardModelBuilder } from "../../../eios-runtime";
import type { DashboardModel } from "../../../eios-runtime";
import { runtimeMetrics } from "./runtime-metrics";
import { missionTimeline } from "./timeline";

function buildDashboard(): DashboardModel {
  const snapshots = runtimeMetrics.allSnapshots();
  const timelines = missionTimeline.all();
  const running = timelines.filter(t => t.status === "active").length;
  const completed = timelines.filter(t => t.status === "completed").length;
  const failed = timelines.filter(t => t.status === "failed").length;
  let todayTotal = 0;
  let totalRequests = 0;
  for (const s of snapshots) {
    todayTotal += s.avgTokens * s.missionCount;
    totalRequests += s.missionCount;
  }
  const healthScore = snapshots.length > 0
    ? Math.round(snapshots.reduce((sum, s) => sum + s.verificationPassRate, 0) / snapshots.length)
    : 100;
  return DashboardModelBuilder.build({
    healthScore,
    registryCount: snapshots.length,
    pipelineCount: 0,
    governanceScore: healthScore,
    memoryUsageMB: 0,
    cpuUsage: 0,
    activePipelines: 0,
    queuedPipelines: 0,
    uptimeSeconds: 0,
    missionsRunning: running,
    missionsCompleted: completed,
    missionsFailed: failed,
    tokensTodayTotal: todayTotal,
    tokensAvgPerRequest: totalRequests > 0 ? Math.round(todayTotal / totalRequests) : 0,
    tokensCompressionRate: 43,
  });
}

export const dashboard = { build: buildDashboard };
