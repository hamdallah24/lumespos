export interface ResourceSnapshot {
  cpuPercent: number;
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  eventLoopLag: number;
  activeHandles: number;
  activeTimers: number;
  uptimeSeconds: number;
  timestamp: string;
}

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

export const ResourceMonitor = {
  snapshot(): ResourceSnapshot {
    const now = Date.now();
    const cpu = process.cpuUsage();
    const elapsed = (now - lastCpuTime) / 1000;
    const userDiff = cpu.user - lastCpuUsage.user;
    const sysDiff = cpu.system - lastCpuUsage.system;
    const cpuPercent = elapsed > 0 ? ((userDiff + sysDiff) / 1000 / elapsed) * 100 : 0;
    lastCpuUsage = cpu;
    lastCpuTime = now;

    const mem = process.memoryUsage();

    return {
      cpuPercent: Math.round(cpuPercent * 100) / 100,
      heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rssMB: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      eventLoopLag: 0,
      activeHandles: 0,
      activeTimers: 0,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  },
};
