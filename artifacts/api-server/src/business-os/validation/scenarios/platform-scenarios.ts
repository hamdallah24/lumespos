import type { BusinessScenario } from "../types";

export const platformScenarios: BusinessScenario[] = [
  {
    id: "plt-001", name: "System Performance Degradation", domain: "platform",
    description: "Performa sistem menurun, response time melambat",
    trigger: { type: "event", eventType: "platform.performance_degradation", data: { serviceName: "API Gateway", avgResponseTime: 4500, baselineResponseTime: 800, increasePct: 462, cpuUsage: 92, memoryUsage: 88, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CTO", expectedCapabilities: ["cap_platform"],
    expectedActions: ["ScaleInfrastructure", "PerformanceTuning"], expectedEvents: ["platform.performance_restored"],
    priority: "critical", tags: ["platform", "performance", "infrastructure"],
  },
  {
    id: "plt-002", name: "Security Breach Detected", domain: "platform",
    description: "Potensi pelanggaran keamanan terdeteksi",
    trigger: { type: "event", eventType: "platform.security_breach", data: { severity: "high", source: "IP 203.0.113.45", type: "brute_force", targetService: "ERP Login", attempts: 1500, blockedPct: 100, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CTO", expectedCapabilities: ["cap_platform"],
    expectedActions: ["IncidentResponse", "SecurityHardening"], expectedEvents: ["platform.security_incident_handled"],
    priority: "critical", tags: ["platform", "security", "incident"],
  },
  {
    id: "plt-003", name: "Database Replication Lag", domain: "platform",
    description: "Replikasi database mengalami keterlambatan",
    trigger: { type: "event", eventType: "platform.db_replication_lag", data: { database: "ERP-Production", lagSeconds: 180, thresholdSeconds: 30, impact: "Data tidak konsisten antar cabang", branchId: 1 }, branchId: 1 },
    expectedExecutive: "CTO", expectedCapabilities: ["cap_platform"],
    expectedActions: ["InvestigateReplication", "FailoverIfNeeded"], expectedEvents: ["platform.replication_fixed"],
    priority: "high", tags: ["platform", "database", "infrastructure"],
  },
  {
    id: "plt-004", name: "Backup Failure Alert", domain: "platform",
    description: "Backup rutin gagal dilaksanakan",
    trigger: { type: "event", eventType: "platform.backup_failed", data: { backupId: "BKP-2026-07-27", type: "full", target: "ERP Database", size: 15000000000, errorCode: "DISK_FULL", storageUtilization: 97, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CTO", expectedCapabilities: ["cap_platform"],
    expectedActions: ["ResolveBackup", "ExpandStorage"], expectedEvents: ["platform.backup_succeeded"],
    priority: "critical", tags: ["platform", "backup", "disaster-recovery"],
  },
  {
    id: "plt-005", name: "API Rate Limit Exceeded", domain: "platform",
    description: "API mencapai batas rate limit dari integrator eksternal",
    trigger: { type: "event", eventType: "platform.rate_limit_hit", data: { apiName: "Payment Gateway", limitPerMinute: 300, currentRate: 310, blockedRequests: 45, externalProvider: "Midtrans", branchId: 1 }, branchId: 1 },
    expectedExecutive: "CTO", expectedCapabilities: ["cap_platform"],
    expectedActions: ["UpgradeLimit", "ImplementQueue"], expectedEvents: ["platform.rate_limit_resolved"],
    priority: "high", tags: ["platform", "api", "integration"],
  },
  {
    id: "plt-006", name: "SSL Certificate Expiring", domain: "platform",
    description: "Sertifikat SSL akan kedaluwarsa",
    trigger: { type: "event", eventType: "platform.ssl_expiring", data: { domain: "app.poscompany.com", issuer: "Let's Encrypt", expiryDate: "2026-08-15", daysLeft: 19, branchId: 1 }, branchId: 1 },
    expectedExecutive: "CTO", expectedCapabilities: ["cap_platform"],
    expectedActions: ["RenewSSL", "VerifyDeployment"], expectedEvents: ["platform.ssl_renewed"],
    priority: "high", tags: ["platform", "security", "certificate"],
  },
];
