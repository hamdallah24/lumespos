import React from "react";
import { Activity, CheckCircle2, XCircle, Layers, Shield, Cpu, Brain, Database, GitBranch, Zap, Users, FileText, Server, AlertTriangle, Clock, BarChart3, Radio } from "lucide-react";

const LAYER_ICONS: Record<string, React.ComponentType<any>> = {
  CEO: Zap, CTO: Cpu, COO: Database, CFO: FileText, CKO: Brain, QA: Shield, DevOps: Server, Research: GitBranch,
};

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

export default function EngineeringOSDashboard() {
  const [readiness, setReadiness] = React.useState<ReadinessData | null>(null);
  const [health, setHealth] = React.useState<HealthData | null>(null);
  const [orgData, setOrgData] = React.useState<any>(null);
  const [observatory, setObservatory] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/ai/readiness-public", { credentials: "include" }).then(r => r.json()),
      fetch("/api/ai/health", { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch("/api/ai/org-public", { credentials: "include" }).then(r => r.json()).catch(() => null),
      fetch("/api/ai/observatory", { credentials: "include" }).then(r => r.json()).catch(() => null),
    ]).then(([r, h, o, obs]) => {
      setReadiness(r);
      setHealth(h);
      setOrgData(o);
      setObservatory(obs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const MATURITY_PCT: Record<string, number> = { L0: 25, L1: 55, L2: 85 };
  const layers = React.useMemo(() => {
    if (!orgData?.tree) return [];
    return orgData.tree.map((n: any) => {
      const pct = MATURITY_PCT[n.maturity] || 30;
      const color = n.health === "Healthy" ? "bg-green-500" : n.health === "Busy" ? "bg-blue-500" : "bg-yellow-500";
      const Icon = LAYER_ICONS[n.runtime] || Layers;
      return { name: n.runtime, pct, icon: Icon, color, health: n.health, maturity: n.maturity };
    });
  }, [orgData]);

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

        {/* Status Cards — semua real data */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatusCard label="Readiness" value={readiness?.ready ? "Healthy" : "Degraded"} color={readiness?.ready ? "green" : "red"} />
          <StatusCard label="Health Score" value={health ? `${health.score}/100` : "—"} color={health && health.score >= 80 ? "green" : "yellow"} />
          <StatusCard label="Tests Passed" value={readiness ? `${readiness.passed}/${readiness.total}` : "—"} color={readiness && readiness.failed === 0 ? "green" : "yellow"} />
          <StatusCard label="Runtimes" value={orgData?.tree ? `${orgData.tree.length} active` : "—"} color="blue" />
        </div>

        {/* Architecture Maturity — dari org tree */}
        {layers.length > 0 && (
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-[#1565FF]/10 p-5">
            <h2 className="text-sm font-semibold mb-4 text-slate-700 dark:text-white">Runtime Maturity</h2>
            <div className="space-y-3">
              {layers.map(layer => (
                <div key={layer.name} className="flex items-center gap-3">
                  <layer.icon className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs text-slate-600 dark:text-slate-300 w-24 shrink-0">{layer.name}</span>
                  <span className="text-[10px] text-slate-400 w-8 shrink-0">{layer.maturity}</span>
                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${layer.color} rounded-full transition-all`} style={{ width: `${layer.pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-500 w-10 text-right">{layer.pct}%</span>
                  <span className={`text-[10px] w-14 text-right ${
                    layer.health === "Healthy" ? "text-green-500" : layer.health === "Busy" ? "text-blue-500" : "text-yellow-500"
                  }`}>{layer.health}</span>
                </div>
              ))}
            </div>
          </div>
        )}

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

        {/* AI Observatory */}
        {observatory && (
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-[#1565FF]/10 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Radio className="w-4 h-4 text-green-500" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-white">AI Observatory</h2>
              <span className="text-[10px] text-slate-400 ml-auto">uptime {Math.floor(observatory.gateway.uptime / 60)}m · {observatory.gateway.requestCount} requests</span>
            </div>

            {/* Pipeline Stages */}
            {observatory.pipeline.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">Pipeline Stages</h3>
                <div className="space-y-1.5">
                  {observatory.pipeline.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.status === 'success' ? 'bg-green-500' : s.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <span className="w-24 text-slate-600 dark:text-slate-300">{s.name}</span>
                      <span className="text-slate-400">{s.latencyMs}ms</span>
                      <span className="text-slate-400">·</span>
                      <span className={s.confidence > 0.7 ? 'text-green-600' : 'text-yellow-600'}>{Math.round(s.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* System Health */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400">Awareness</div>
                <div className="text-sm font-bold text-slate-700 dark:text-white">{observatory.awareness?.score ?? '—'}</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400">Health</div>
                <div className={`text-sm font-bold ${observatory.awareness?.overallHealth === 'healthy' ? 'text-green-600' : 'text-yellow-600'}`}>
                  {observatory.awareness?.overallHealth ?? '—'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400">Success Rate</div>
                <div className="text-sm font-bold text-slate-700 dark:text-white">
                  {observatory.learning ? `${Math.round(observatory.learning.overallSuccessRate * 100)}%` : '—'}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div className="text-[10px] text-slate-400">Avg Confidence</div>
                <div className="text-sm font-bold text-slate-700 dark:text-white">
                  {observatory.learning ? `${Math.round(observatory.learning.overallAvgConfidence * 100)}%` : '—'}
                </div>
              </div>
            </div>

            {/* Provider Health */}
            {Object.keys(observatory.providerHealth).length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">Provider Circuit Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(observatory.providerHealth).map(([name, status]: [string, any]) => (
                    <div key={name} className={`p-2 rounded-lg text-xs ${status.state === 'CLOSED' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'}`}>
                      <span className="font-medium text-slate-600 dark:text-slate-300">{name}</span>
                      <span className={`ml-2 ${status.state === 'CLOSED' ? 'text-green-600' : 'text-red-600'}`}>{status.state}</span>
                      <span className="text-slate-400 ml-1">({status.failureCount} failures)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Patterns */}
            {observatory.patterns.length > 0 && (
              <div>
                <h3 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase">Patterns</h3>
                <div className="flex flex-wrap gap-1.5">
                  {observatory.patterns.map((p: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 text-[10px] rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">{p}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
