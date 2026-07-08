// ECP-009: Executive Workspace — CEO-directed operating center
// Frontend never calls LLM directly. Always through CEO Runtime → Kernel.

import React from "react";
import { Activity, CheckCircle2, Clock, Users, Shield, Brain, Layers, GitBranch, Zap, ArrowRight, Send, Target, FileText, AlertTriangle, Copy, Check } from "lucide-react";
import { getCsrfToken } from "@/lib/csrf";
import { RuntimeProgressCard } from "@/components/runtime-progress-card";
import { ActiveMissions } from "@/components/active-missions";
import { MissionDetail } from "@/components/mission-detail";

const SS_KEY_INPUT = "exec.input";
const SS_KEY_REPORTS = "exec.reports";

function ssLoad<T>(key: string, fallback: T): T {
  try { const v = sessionStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function ssSave(key: string, val: unknown): void {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch { /* quota exceeded */ }
}

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
  const [pipelineState, setPipelineState] = React.useState<string>("");
  const [toolEvents, setToolEvents] = React.useState<{ name: string; status: string; durationMs?: number }[]>([]);
  const [execSnapshot, setExecSnapshot] = React.useState<any>(null);
  const [statusMsg, setStatusMsg] = React.useState<string>("");
  const [reports, setReports] = React.useState<ExecutiveReport[]>([]);
  const [input, setInput] = React.useState(() => ssLoad<string>(SS_KEY_INPUT, ""));
  const [loading, setLoading] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  // ECP-047: Executive Workspace state
  const [missionPhase, setMissionPhase] = React.useState<string>("idle");
  const [execCards, setExecCards] = React.useState<{ executive: string; status: string; progress: number; duration: number }[]>([]);
  const [timeline, setTimeline] = React.useState<{ time: string; text: string }[]>([]);
  const [synthesis, setSynthesis] = React.useState<{ active: boolean; execCount: number; evidenceCount: number }>({ active: false, execCount: 0, evidenceCount: 0 });

  // ADR-009: Evidence + Mission store
  const [evidenceScore, setEvidenceScore] = React.useState<any>(null);
  const [missionProgress, setMissionProgress] = React.useState<any>(null);
  const [selectedMissionId, setSelectedMissionId] = React.useState<number | null>(null);

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

    // Subscribe auto-notifikasi mission selesai
    const es = new EventSource("/api/ai/mission/events", { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "completed" && d.data?.summary) {
          setReports(prev => {
            if (prev.some(r => r.text?.includes(`Misi #${d.missionId} Selesai`))) return prev;
            return [...prev, { role: "CEO" as const, text: `✅ **Misi #${d.missionId} Selesai**\n\n${d.data.summary}`, timestamp: new Date().toISOString() }];
          });
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [reports]);

  React.useEffect(() => { ssSave(SS_KEY_INPUT, input); }, [input]);

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
              // Type: delta → accumulate text
              if (data.type === "delta") accumulated += data.delta;
              if (data.type === "done") accumulated = data.finalText || accumulated;
              // Legacy format
              if (data.delta && !data.type) accumulated += data.delta;
              if (data.done && !data.type) accumulated = data.finalText || accumulated;
              // ECP-015: Tool events
              if (data.type === "tool") {
                setToolEvents(prev => [...prev.slice(-10), { name: data.payload?.name || data.event, status: data.event, durationMs: data.durationMs }]);
              }
              // ECP-015: Pipeline state
              if (data.type === "system") {
                setPipelineState(data.payload?.state || "");
              }
              // ECP-015: Runtime events (delegation)
              if (data.type === "runtime") {
                setPipelineState(`${data.runtime}: ${data.event} → ${data.payload?.to || ""}`);
              }
              // Status remains as-is
              if (data.type === "status") {
                setStatusMsg(data.message);
                // ECP-047: Detect execution lifecycle phases from status messages
                const msg = data.message || String(data.state || "");
                if (msg.includes("Dispatching") || msg.includes("Mendelegasikan")) {
                  setMissionPhase("dispatching");
                } else if (msg.includes("Synthesizing")) {
                  setSynthesis(s => ({ ...s, active: true }));
                } else if (msg.includes(":") && !msg.startsWith("[")) {
                  // Per-executive status: "CTO: Executing"
                }
              }
              // ECP-047: Per-executive state updates (prefixed: "CTO: Running")
              if (data.type === "status" && data.state) {
                const st = String(data.state);
                const colonIdx = st.indexOf(":");
                if (colonIdx > 1) {
                  const execName = st.slice(0, colonIdx).trim();
                  const execState = st.slice(colonIdx + 1).trim();
                  setExecCards(prev => {
                    const existing = prev.findIndex(c => c.executive === execName);
                    if (existing >= 0) {
                      const copy = [...prev];
                      copy[existing] = { ...copy[existing], status: execState };
                      return copy;
                    }
                    return [...prev, { executive: execName, status: execState, progress: 0, duration: 0 }];
                  });
                  setTimeline(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), text: `${execName}: ${execState}` }]);
                }
              }
              // ECP-020: Execution progress updates
              if (data.type === "execution_update") {
                setExecSnapshot(data);
                setMissionPhase("executing");
                // Update executive card progress
                if (data.owner && data.owner !== "Self") {
                  setExecCards(prev => prev.map(c =>
                    c.executive === data.owner ? { ...c, progress: data.progress?.execution || 0 } : c
                  ));
                }
              }
              // Tool events → timeline
              if (data.type === "tool") {
                setTimeline(prev => [...prev.slice(-19), {
                  time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
                  text: `⚙️ ${data.payload?.name || data.event}`,
                }]);
              }
              // ADR-009: Evidence update from metrics layer
              if (data.type === "evidence_update") {
                setEvidenceScore(data.payload);
              }
              // ADR-009: Mission progress from metrics layer
              if (data.type === "mission_update") {
                setMissionProgress(data.payload);
              }
            } catch {}
          }
        }
        if (accumulated) {
          setReports(prev => [...prev, { role: "CTO", text: accumulated, timestamp: new Date().toISOString() }]);
        }
        // ECP-047: Synthesis complete — collapse card after delay
        setSynthesis(s => ({ ...s, active: false }));
        setMissionPhase("completed");
        setTimeout(() => { setExecCards([]); setMissionPhase("idle"); }, 3000);
      }
    } catch {
      setReports(prev => [...prev, { role: "CTO", text: "Respons sedang diproses. Hasil akan muncul setelah refresh halaman.", timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCommand(); }
  };

  return (
    <div className="flex-1 bg-gradient-to-b from-slate-50 to-white dark:from-[#0A1F44] dark:to-[#071426]">
      <div className="flex h-full overflow-hidden pb-20 lg:pb-0">
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
              <StatusBadge icon={Activity} label="Health" value={orgData?.health ? String(Math.round(orgData.health.healthy / orgData.health.total * 100)) : "—"} color={orgData?.health ? (orgData.health.healthy / orgData.health.total >= 0.7 ? "green" : "yellow") : "slate"} />
            </div>
          </header>

          {/* ECP-047: Executive Workspace — Mission + Board + Timeline + Synthesis */}
          {(missionPhase !== "idle" || execCards.length > 0) && (
            <div className="px-6 py-3 space-y-3 border-b border-[#1565FF]/10 bg-white/50 dark:bg-white/[0.02]">
              {/* Mission Card */}
              {missionPhase !== "idle" && (
                <div className="flex items-center gap-4 text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">
                    Mission · <span className="text-[#1565FF]">{missionPhase}</span>
                  </span>
                  {execSnapshot?.progress && (
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[200px]">
                      <div className="h-full bg-[#1565FF] rounded-full transition-all duration-500" style={{ width: `${execSnapshot.progress.overall || 0}%` }} />
                    </div>
                  )}
                  <span className="text-slate-400">{execSnapshot?.progress?.overall || 0}%</span>
                </div>
              )}

              {/* Executive Board */}
              {execCards.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {execCards.map(c => (
                    <div key={c.executive} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${
                      c.status === "Running" || c.status === "Executing" || c.status.includes("Dispatching")
                        ? "border-[#1565FF]/30 bg-[#1565FF]/5"
                        : c.status === "Completed" || c.status === "Selesai"
                          ? "border-green-200 bg-green-50 dark:bg-green-950/30"
                          : "border-slate-200 bg-slate-50 dark:bg-slate-800/50"
                    }`}>
                      <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: c.status.includes("Run") || c.status.includes("Exec") ? "#1565FF" : c.status.includes("Complet") || c.status.includes("Selesai") ? "#22c55e" : "#94a3b8" }} />
                      <span className="font-medium text-slate-600 dark:text-slate-300">{c.executive}</span>
                      <span className="text-slate-400">{c.status}</span>
                      {c.progress > 0 && (
                        <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1565FF] rounded-full" style={{ width: `${c.progress}%` }} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Execution Timeline */}
              {timeline.length > 0 && (
                <details className="text-xs">
                  <summary className="text-slate-400 cursor-pointer hover:text-slate-600">Timeline ({timeline.length})</summary>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {timeline.map((t, i) => (
                      <div key={i} className="flex gap-2 text-slate-500">
                        <span className="text-slate-300 shrink-0">{t.time}</span>
                        <span>{t.text}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* CEO Synthesis Card */}
              {synthesis.active && (
                <div className="flex items-center gap-3 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 text-xs">
                  <Brain className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-amber-700 dark:text-amber-300">CEO Synthesis</span>
                  <span className="text-amber-500">Synthesizing...</span>
                  <span className="ml-auto text-amber-400 animate-pulse">●●●</span>
                </div>
              )}
            </div>
          )}

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
            {/* ECP-020: Loading indicator — belly Memproses... */}
            {loading && !execSnapshot && (
              <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse px-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#1565FF]" /> Memproses...
              </div>
            )}
            {/* RFC-010: Progress Card — prefer MissionProgress when available */}
            {(execSnapshot || missionProgress) && (
              <RuntimeProgressCard
                snapshot={execSnapshot}
                variant="full"
                toolEvents={toolEvents.map(t => ({ name: t.name, status: t.status as "started" | "completed", durationMs: t.durationMs }))}
              />
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

        {/* Right: Dashboard — Desktop only */}
        <div className="hidden lg:flex w-80 border-l border-[#1565FF]/10 flex-col overflow-y-auto p-5 space-y-5">
          <Section title="Organization" icon={GitBranch}>
            {orgData?.tree ? <OrgMiniGraph nodes={orgData.tree} /> : <p className="text-xs text-slate-400">Loading...</p>}
          </Section>
          <ActiveMissions onSelect={setSelectedMissionId} />
          <Section title="Runtime Status" icon={Activity}>
            {orgData?.health ? (
              <div className="space-y-1.5 text-xs">
                <StatusRow label="Healthy" value={`${orgData.health.healthy}/${orgData.health.total}`} color="green" />
                <StatusRow label="Busy" value={`${orgData.health.busy}`} color="yellow" />
                <StatusRow label="Planned" value={`${orgData.health.planned}`} color="blue" />
                <StatusRow label="Offline" value={`${orgData.health.offline}`} color="red" />
              </div>
            ) : readiness ? (
              <div className="space-y-1.5 text-xs">
                <StatusRow label="Readiness" value={`${readiness.passed}/${readiness.total}`} color={readiness.passed === readiness.total ? "green" : "yellow"} />
                <StatusRow label="Failed" value={`${readiness.failed}`} color={readiness.failed > 0 ? "red" : "green"} />
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-2 text-center">Memuat status...</div>
            )}
          </Section>
        </div>
      </div>

      {/* MissionDetail — di luar sidebar, accessible di all screen sizes */}
      {selectedMissionId && <MissionDetail missionId={selectedMissionId} onClose={() => setSelectedMissionId(null)} />}

      {/* Mobile FAB: floating button untuk misi aktif */}
      <div className="lg:hidden fixed bottom-24 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={() => setSelectedMissionId(-1)}
          className="w-12 h-12 rounded-full bg-[#1565FF] text-white shadow-lg flex items-center justify-center hover:bg-[#1565FF]/90 transition-all active:scale-95"
        >
          <Target size={20} />
        </button>
      </div>

      {/* Mobile mission panel (slide-up) */}
      {selectedMissionId === -1 && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setSelectedMissionId(null)}>
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto mb-4" />
            <ActiveMissions onSelect={(id) => setSelectedMissionId(id)} />
          </div>
        </div>
      )}
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
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
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
        <button type="button" onClick={() => copy(report.text)} className={`absolute bottom-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all active:scale-90 ${isUser ? "text-white/50 hover:text-white/80" : "text-slate-300 hover:text-slate-500"}`}>
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
