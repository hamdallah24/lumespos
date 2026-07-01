// ECP-009: Executive Workspace — CEO-directed operating center
// Frontend never calls LLM directly. Always through CEO Runtime → Kernel.

import React from "react";
import { Activity, CheckCircle2, Clock, Users, Shield, Brain, Layers, GitBranch, Zap, ArrowRight, Send, Target, FileText, AlertTriangle, Copy, Check } from "lucide-react";
import { getCsrfToken } from "@/lib/csrf";

type ReadinessData = { ready: boolean; passed: number; failed: number; details: any[] };
type AgentInfo = { name: string; version: string; health: { status: string } };

type ExecutiveReport = {
  role: "CEO" | "CTO" | "COO";
  text: string;
  missionId?: string;
  status?: "created" | "delegated" | "executing" | "completed";
  timestamp: string;
};

export default function ExecutiveWorkspace() {
  const [readiness, setReadiness] = React.useState<ReadinessData | null>(null);
  const [agents, setAgents] = React.useState<AgentInfo[]>([]);
  const [orgData, setOrgData] = React.useState<any>(null);
  const [missionData, setMissionData] = React.useState<any>(null);
  const [reports, setReports] = React.useState<ExecutiveReport[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // Fetch org status on mount
  React.useEffect(() => {
    fetch("/api/ai/readiness-public").then(r => r.json()).then(setReadiness);
    fetch("/api/ai/agents").then(r => r.json()).then(d => setAgents(d.agents || []));
    fetch("/api/ai/org-public").then(r => r.json()).then(setOrgData).catch(() => {});
    fetch("/api/ai/missions").then(r => r.json()).then(setMissionData).catch(() => {});
    // Load conversation history
    fetch("/api/ai/history?mode=ceo", { credentials: "include" })
      .then(r => r.json()).then(d => {
        if (d.messages) setReports(d.messages.map((m: any) => ({ role: m.role === "user" ? "CEO" : "CEO" as const, text: m.content, timestamp: new Date().toISOString() })));
      }).catch(() => {});
  }, []);

  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [reports]);

  const sendCommand = async () => {
    if (!input.trim() || loading) return;
    const cmd = input.trim();
    setInput("");
    setLoading(true);

    // Add user message
    setReports(prev => [...prev, { role: "CEO", text: cmd, timestamp: new Date().toISOString() }]);

    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({ message: cmd, mode: "ceo" }),
      });
      if (!resp.ok) throw new Error("Server error");

      // Handle SSE stream
      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const json = await resp.json();
        setReports(prev => [...prev, { role: "CTO", text: json.reply || "No response", timestamp: new Date().toISOString() }]);
      } else {
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();
        let buf = "", accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "delta") accumulated += data.delta;
              if (data.type === "done") accumulated = data.finalText || accumulated;
              if (data.delta) accumulated += data.delta;
              if (data.done) accumulated = data.finalText || accumulated;
            } catch {}
          }
        }
        if (accumulated) {
          setReports(prev => [...prev, { role: "CTO", text: accumulated, timestamp: new Date().toISOString() }]);
        }
      }
    } catch {
      setReports(prev => [...prev, { role: "CTO", text: "Sedang memproses. Silakan coba lagi.", timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCommand(); }
  };

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-slate-50 to-white dark:from-[#0A1F44] dark:to-[#071426]">
      <div className="flex h-full">
        {/* Left: Executive Reports */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="px-6 py-4 border-b border-[#1565FF]/10 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1565FF] to-[#0A4CD0] flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 dark:text-white">Executive Workspace</h1>
              <p className="text-xs text-slate-400">CEO Runtime · {readiness ? `${readiness.passed}/${readiness.passed + readiness.failed} tests` : "loading..."}</p>
            </div>
            <div className="ml-auto flex items-center gap-3 text-xs">
              <StatusBadge icon={Shield} label="Kernel" value={readiness?.ready ? "Locked" : "Degraded"} color={readiness?.ready ? "green" : "red"} />
              <StatusBadge icon={Users} label="Agents" value={`${agents.length}`} color="blue" />
              <StatusBadge icon={Activity} label="Health" value="96" color="green" />
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {reports.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                <Zap className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Executive Workspace</p>
                <p className="text-xs mt-1">Ketik perintah bisnis atau teknis. CEO akan mengatur organisasi.</p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  {["📊 Laporan penjualan hari ini", "🔧 Ada bug di inventory", "📋 Status mission aktif", "💡 Ide untuk minggu depan"].map(s => (
                    <button key={s} onClick={() => { setInput(s); sendCommand(); }} className="px-3 py-1.5 text-[11px] rounded-lg border border-[#1565FF]/15 bg-white dark:bg-white/[0.03] hover:bg-[#1565FF]/5 transition-all text-slate-500">{s}</button>
                  ))}
                </div>
              </div>
            )}
            {reports.map((r, i) => (
              <ExecutiveCard key={i} report={r} />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1565FF]" /> Memproses...
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <footer className="px-6 pb-4 pt-2 border-t border-[#1565FF]/10">
            <div className="flex items-center gap-2 bg-white dark:bg-white/[0.03] rounded-2xl border border-[#1565FF]/10 px-4 py-3">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Apa yang bisa CEO bantu?"
                disabled={loading}
                className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-white placeholder:text-slate-400 disabled:opacity-50"
              />
              <button onClick={sendCommand} disabled={!input.trim() || loading} className="w-8 h-8 rounded-xl bg-[#1565FF] text-white flex items-center justify-center hover:bg-[#1565FF]/90 disabled:opacity-30 transition-all shrink-0">
                <Send size={14} />
              </button>
            </div>
          </footer>
        </div>

        {/* Right: Dashboard */}
        <div className="hidden lg:flex w-80 border-l border-[#1565FF]/10 flex-col overflow-y-auto p-5 space-y-5">
          <Section title="Organization" icon={GitBranch}>
            {orgData?.tree ? <OrgMiniGraph nodes={orgData.tree} /> : <p className="text-xs text-slate-400">Loading...</p>}
          </Section>
          <Section title="Active Missions" icon={Target}>
            {missionData?.active?.length > 0
              ? <p className="text-xs text-green-600 font-medium">{missionData.active.length} active</p>
              : <p className="text-xs text-slate-400">Belum ada mission aktif</p>}
          </Section>
          <Section title="Pending Approvals" icon={FileText}>
            <p className="text-xs text-slate-400">Tidak ada proposal pending</p>
          </Section>
          <Section title="Knowledge Gaps" icon={AlertTriangle}>
            <p className="text-xs text-slate-400">Tidak ada gap terdeteksi</p>
          </Section>
          <Section title="Runtime Status" icon={Activity}>
            {orgData?.health ? (
              <div className="space-y-1.5 text-xs">
                <StatusRow label="Healthy" value={`${orgData.health.healthy}/${orgData.health.total}`} color="green" />
                <StatusRow label="Busy" value={`${orgData.health.busy}`} color="yellow" />
                <StatusRow label="Planned" value={`${orgData.health.planned}`} color="blue" />
                <StatusRow label="Offline" value={`${orgData.health.offline}`} color="red" />
              </div>
            ) : (
              <div className="space-y-1.5 text-xs">
                <StatusRow label="Foundation" value="100%" color="green" />
                <StatusRow label="Runtime" value="78%" color="blue" />
                <StatusRow label="Knowledge" value="70%" color="blue" />
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = { green: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300", red: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300", blue: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" };
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${colors[color]}`}>
      <Icon size={12} />
      <span className="font-medium">{value}</span>
      <span className="opacity-60">{label}</span>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <Icon size={14} />
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusRow({ label, value, color }: { label: string; value: string; color: string }) {
  const barColors: Record<string, string> = { green: "bg-green-400", blue: "bg-blue-400", yellow: "bg-yellow-400" };
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-slate-400">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColors[color]} rounded-full`} style={{ width: value }} />
      </div>
      <span className="text-slate-500 w-10 text-right">{value}</span>
    </div>
  );
}

function ExecutiveCard({ report }: { report: ExecutiveReport }) {
  const [copied, setCopied] = React.useState(false);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const isUser = report.role === "CEO";

  return (
    <div className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
      {/* Icon + timestamp on top */}
      <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${isUser ? "flex-row-reverse" : ""}`}>
        {isUser ? <Zap className="w-3 h-3 text-[#1565FF]" /> : <Brain className="w-3 h-3 text-[#1565FF]" />}
        <span>{report.role}</span>
        <span>·</span>
        <span>{new Date(report.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>

      {/* Wide bubble */}
      <div className={`relative max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
        isUser
          ? "bg-[#1565FF] text-white rounded-br-sm"
          : "bg-white dark:bg-white/[0.05] border border-[#1565FF]/10 text-slate-700 dark:text-white rounded-bl-sm"
      }`}>
        <p className="whitespace-pre-wrap leading-relaxed pr-6">{report.text}</p>
        {/* Copy button */}
        <button onClick={() => copy(report.text)} className={`absolute bottom-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all active:scale-90 ${isUser ? "text-white/50 hover:text-white/80" : "text-slate-300 hover:text-slate-500"}`}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </div>
  );
}

function OrgMiniGraph({ nodes }: { nodes: any[] }) {
  const levelMap: Record<string, number> = { A: 1, B: 2, C: 3 };
  const healthColor = (h: string) => h === "Healthy" ? "bg-green-400" : h === "Busy" ? "bg-yellow-400" : "bg-slate-300";

  return (
    <div className="text-[10px] space-y-0.5">
      <div key="Founder" className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" /><span className="text-slate-500">Founder</span></div>
      {nodes.map(n => (
        <div key={n.runtime} className="flex items-center gap-1.5" style={{ paddingLeft: (levelMap[n.level] || 1) * 12 }}>
          <span className={`w-1.5 h-1.5 rounded-full ${healthColor(n.health)}`} />
          <span className="text-slate-500">{n.runtime}</span>
          <span className="text-slate-300">{n.maturity}</span>
        </div>
      ))}
    </div>
  );
}
