import React from "react";
import { Activity, CheckCircle2, XCircle, Layers, Shield, Cpu, Brain, Database, GitBranch } from "lucide-react";

type ReadinessData = {
  ready: boolean;
  passed: number;
  failed: number;
  total: number;
  details: { suite: string; passed: number; failed: number; failures: { name: string; detail: string }[] }[];
};

type HealthData = {
  score: number;
  status: string;
  components: { name: string; weight: number; score: number; status: string; detail: string }[];
  registry: string;
  timestamp: string;
};

const ENG_OS_LAYERS = [
  { name: "Foundation", pct: 100, icon: Layers, color: "bg-green-500" },
  { name: "Foundation Adoption", pct: 100, icon: GitBranch, color: "bg-green-500" },
  { name: "Runtime", pct: 80, icon: Cpu, color: "bg-blue-500" },
  { name: "Knowledge", pct: 70, icon: Brain, color: "bg-blue-500" },
  { name: "Governance", pct: 80, icon: Shield, color: "bg-green-500" },
  { name: "Security", pct: 70, icon: Shield, color: "bg-blue-500" },
  { name: "Identity", pct: 30, icon: Database, color: "bg-yellow-500" },
];

export default function EngineeringOSDashboard() {
  const [readiness, setReadiness] = React.useState<ReadinessData | null>(null);
  const [health, setHealth] = React.useState<HealthData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/ai/readiness-public", { credentials: "include" }).then(r => r.json()),
      fetch("/api/ai/health", { credentials: "include" }).then(r => r.json()).catch(() => null),
    ]).then(([r, h]) => {
      setReadiness(r);
      setHealth(h);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-pulse text-slate-400">Loading Engineering OS...</div></div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-[#0A1F44] dark:to-[#071426] p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1565FF] to-[#0A4CD0] flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Engineering OS</h1>
            <p className="text-xs text-slate-400">
              {readiness ? `${readiness.passed}/${readiness.total} tests · ${readiness.ready ? "Healthy" : "Degraded"}` : "Loading..."}
            </p>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <StatusCard label="Readiness" value={readiness?.ready ? "Healthy" : "Degraded"} color={readiness?.ready ? "green" : "red"} />
          <StatusCard label="Health Score" value={health ? `${health.score}/100` : "—"} color={health && health.score >= 80 ? "green" : "yellow"} />
          <StatusCard label="Components" value={readiness ? `${readiness.total} tests` : "—"} color="blue" />
        </div>

        {/* Architecture Layers */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-[#1565FF]/10 p-5">
          <h2 className="text-sm font-semibold mb-4 text-slate-700 dark:text-white">Architecture Maturity</h2>
          <div className="space-y-3">
            {ENG_OS_LAYERS.map(layer => (
              <div key={layer.name} className="flex items-center gap-3">
                <layer.icon className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="text-xs text-slate-600 dark:text-slate-300 w-36 shrink-0">{layer.name}</span>
                <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${layer.color} rounded-full transition-all`} style={{ width: `${layer.pct}%` }} />
                </div>
                <span className="text-xs font-medium text-slate-500 w-10 text-right">{layer.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Health Policy Breakdown */}
        {health && (
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-[#1565FF]/10 p-5">
            <h2 className="text-sm font-semibold mb-4 text-slate-700 dark:text-white">Health Policy Score</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {health.components.map(c => (
                <div key={c.name} className={`p-3 rounded-lg border text-xs ${
                  c.status === "healthy" ? "border-green-200 bg-green-50 dark:bg-green-950/30" :
                  c.status === "degraded" ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30" :
                  "border-red-200 bg-red-50 dark:bg-red-950/30"
                }`}>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>{c.name}</span>
                    <span className={c.status === "healthy" ? "text-green-600" : c.status === "degraded" ? "text-yellow-600" : "text-red-600"}>{c.score}</span>
                  </div>
                  <div className="text-slate-500">{c.detail}</div>
                  <div className="text-[10px] text-slate-400 mt-1">Weight: {c.weight}%</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Readiness Test Suites */}
        {readiness && (
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-[#1565FF]/10 p-5">
            <h2 className="text-sm font-semibold mb-4 text-slate-700 dark:text-white">Production Readiness</h2>
            <div className="space-y-2">
              {readiness.details.map(suite => (
                <div key={suite.suite} className={`p-3 rounded-lg border text-xs ${
                  suite.failed === 0 ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" : "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                }`}>
                  <div className="flex items-center justify-between font-medium mb-1">
                    <span>{suite.suite}</span>
                    <span className={suite.failed === 0 ? "text-green-600" : "text-red-600"}>
                      {suite.failed === 0 ? <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" /> : <XCircle className="w-3.5 h-3.5 inline mr-1" />}
                      {suite.passed}/{suite.passed + suite.failed}
                    </span>
                  </div>
                  {suite.failures.map((f, i) => (
                    <div key={i} className="text-red-500 text-[10px] ml-5">• {f.name}: {f.detail}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registry */}
        <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-[#1565FF]/10 p-5">
          <h2 className="text-sm font-semibold mb-4 text-slate-700 dark:text-white">Component Registry</h2>
          <p className="text-xs text-slate-400">{health?.registry || "Loading..."}</p>
        </div>

      </div>
    </div>
  );
}

function StatusCard({ label, value, color }: { label: string; value: string; color: "green" | "red" | "blue" | "yellow" }) {
  const colors = {
    green: "border-green-200 bg-green-50 dark:bg-green-950/30 text-green-700",
    red: "border-red-200 bg-red-50 dark:bg-red-950/30 text-red-700",
    blue: "border-blue-200 bg-blue-50 dark:bg-blue-950/30 text-blue-700",
    yellow: "border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-700",
  };
  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <div className="text-[10px] font-medium uppercase opacity-70 mb-1">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
