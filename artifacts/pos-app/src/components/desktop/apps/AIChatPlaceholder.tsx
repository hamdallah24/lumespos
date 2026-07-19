// ECP-009: AI Chat — connected to Executive Runtime
// Full-feature version: ports Executive Workspace capabilities into Cloud Desktop chat overlay

import React from "react";
import {
  Sparkles, Send, Copy, Check, Zap, ChevronDown, ChevronUp,
  Clock, Target, Brain, Activity, AlertTriangle,
} from "lucide-react";
import { getCsrfToken } from "@/lib/csrf";
import MarkdownRenderer from "@/components/markdown-renderer";
import { RuntimeProgressCard } from "@/components/runtime-progress-card";

const SS_KEY_INPUT = "ai-chat.input";

function ssLoad<T>(key: string, fallback: T): T {
  try { const v = sessionStorage.getItem(key); return v ? (JSON.parse(v) as T) : fallback; } catch { return fallback; }
}
function ssSave(key: string, val: unknown): void {
  try { sessionStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
}

type ChatMessage = {
  role: "user" | "assistant" | "system";
  text: string;
  sender?: string;
  timestamp: string;
  system?: boolean;
};

type ExecCard = { executive: string; status: string; progress: number; duration: number };
type TimelineEntry = { time: string; text: string };
type ToolChip = { name: string; status: "started" | "completed"; durationMs?: number };

const QUICK_STARTS = [
  "📊 Laporan penjualan hari ini",
  "🔧 Ada bug di inventory",
  "📋 Status mission aktif",
  "💡 Ide untuk minggu depan",
];

function SiriWave() {
  return (
    <div className="relative flex items-center justify-center w-32 h-32 mx-auto">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="absolute w-1 rounded-full bg-sky-400/20"
          style={{ bottom: "50%", left: `${35 + i * 6}%`, height: "32px",
            transformOrigin: "bottom center", animation: `siriWave 0.8s ${i * 0.1}s ease-in-out infinite` }} />
      ))}
      <style>{`@keyframes siriWave { 0%,100%{transform:scaleY(0.2);opacity:0.4} 50%{transform:scaleY(1.5);opacity:0.8} }`}</style>
    </div>
  );
}

function MsgAvatar({ sender }: { sender?: string }) {
  const [err, setErr] = React.useState(false);
  const map: Record<string, { initials: string; bg: string; src: string }> = {
    CEO: { initials: "CE", bg: "#2563EB", src: "/assets/avatars/ceo.jpeg" },
    CTO: { initials: "CT", bg: "#8B5CF6", src: "/assets/avatars/cto.jpeg" },
    COO: { initials: "CO", bg: "#10B981", src: "/assets/avatars/coo.jpeg" },
    CFO: { initials: "CF", bg: "#F59E0B", src: "/assets/avatars/cfo.jpeg" },
  };
  const cfg = map[sender || ""] || { initials: "AI", bg: "#2563EB", src: "" };
  if (cfg.src && !err) {
    return <img src={cfg.src} alt={sender || "AI"} onError={() => setErr(true)} className="w-5 h-5 rounded-full object-cover" />;
  }
  return (
    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: cfg.bg }}>
      {cfg.initials}
    </div>
  );
}

function CopyBtn({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = () => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <button onClick={copy} className={`w-6 h-6 rounded-md flex items-center justify-center transition-all active:scale-90 ${className || "text-slate-300 hover:text-slate-500"}`}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function MissionActivityCard({
  missionPhase, execCards, timeline, synthesis, execSnapshot, toolEvents, open, onToggle,
}: {
  missionPhase: string; execCards: ExecCard[]; timeline: TimelineEntry[];
  synthesis: { active: boolean; execCount: number; evidenceCount: number };
  execSnapshot: any; toolEvents: ToolChip[]; open: boolean; onToggle: () => void;
}) {
  const hasActivity = missionPhase !== "idle" || execCards.length > 0 || !!execSnapshot || synthesis.active || timeline.length > 0;
  if (!hasActivity) return null;
  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
        <Activity size={12} className="text-sky-500" />
        <span className="flex-1 text-left">Mission Activity</span>
        {missionPhase !== "idle" && <span className="text-sky-500 text-[10px] animate-pulse">{missionPhase}</span>}
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-100 dark:border-white/5">
          {execCards.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {execCards.map(c => (
                <div key={c.executive} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] ${
                  c.status.includes("Run") || c.status.includes("Exec") || c.status.includes("Dispatch")
                    ? "border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-900"
                    : c.status.includes("Complet") || c.status.includes("Selesai")
                    ? "border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900"
                    : "border-slate-200 bg-white dark:bg-slate-800/50 dark:border-slate-700"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{
                    background: c.status.includes("Run") || c.status.includes("Exec") ? "#0ea5e9"
                      : c.status.includes("Complet") ? "#22c55e" : "#94a3b8",
                  }} />
                  <span className="font-medium text-slate-600 dark:text-slate-300">{c.executive}</span>
                  <span className="text-slate-400">{c.status}</span>
                </div>
              ))}
            </div>
          )}
          {execSnapshot && (
            <RuntimeProgressCard snapshot={execSnapshot} variant="compact" toolEvents={toolEvents} />
          )}
          {synthesis.active && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 text-[10px]">
              <Brain size={11} className="text-amber-500 shrink-0" />
              <span className="font-medium text-amber-700 dark:text-amber-300">CEO Synthesis</span>
              <span className="text-amber-500">Synthesizing...</span>
            </div>
          )}
          {timeline.length > 0 && (
            <details className="text-[10px]">
              <summary className="text-slate-400 cursor-pointer hover:text-slate-600">Timeline ({timeline.length})</summary>
              <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                {timeline.slice(-10).map((t, i) => (
                  <div key={i} className="flex gap-2 text-slate-500">
                    <span className="text-slate-300 shrink-0">{t.time}</span>
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function AIChatPlaceholder() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState(() => ssLoad<string>(SS_KEY_INPUT, ""));
  const [loading, setLoading] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState("");
  const [health, setHealth] = React.useState<{ ready: boolean } | null>(null);
  const [execSnapshot, setExecSnapshot] = React.useState<any>(null);
  const [currentSender, setCurrentSender] = React.useState("");
  const [missionPhase, setMissionPhase] = React.useState("idle");
  const [execCards, setExecCards] = React.useState<ExecCard[]>([]);
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>([]);
  const [synthesis, setSynthesis] = React.useState({ active: false, execCount: 0, evidenceCount: 0 });
  const [toolEvents, setToolEvents] = React.useState<ToolChip[]>([]);
  const [missionPanelOpen, setMissionPanelOpen] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const senderRef = React.useRef("");

  const showMission = missionPhase !== "idle" || execCards.length > 0 || !!execSnapshot || synthesis.active || timeline.length > 0;

  React.useEffect(() => { ssSave(SS_KEY_INPUT, input); }, [input]);

  // Load health + history on mount
  React.useEffect(() => {
    fetch("/api/ai/readiness-public").then(r => r.json()).then(setHealth).catch(() => {});
    fetch("/api/ai/history?mode=ceo", { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.messages) setMessages(d.messages.map((m: any) => {
          const senderMatch = m.content?.match(/^\{SENDER:([^}]+)\}/);
          const sender = senderMatch ? senderMatch[1] : "CEO";
          const text = m.content?.replace(/^\{SENDER:[^}]+\}/, "") || m.content;
          return { role: m.role === "user" ? "user" : "assistant", text, sender, timestamp: new Date().toISOString() };
        }));
      }).catch(() => {});

    const es = new EventSource("/api/ai/mission/events", { withCredentials: true });
    es.onmessage = (e) => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === "completed" && d.data?.summary) {
          setMessages(prev => {
            if (prev.some(r => r.text?.includes(`Misi #${d.missionId} Selesai`))) return prev;
            return [...prev, { role: "system", text: `✅ **Misi #${d.missionId} Selesai**\n\n${d.data.summary}`, timestamp: new Date().toISOString(), system: true, sender: "System" }];
          });
        }
        if (d.type === "status_change") {
          setMessages(prev => [...prev, { role: "system", text: `_📋 Misi #${d.missionId}: ${d.status}_`, timestamp: new Date().toISOString(), system: true, sender: "Mission" }]);
        }
      } catch {}
    };
    return () => es.close();
  }, []);

  // Auto-scroll
  React.useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, statusMsg]);
  React.useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => chatEndRef.current?.scrollIntoView({ behavior: "auto" }), 80);
    return () => clearInterval(id);
  }, [loading]);

  const sendMessage = async (text?: string) => {
    if (loading) return;
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: msg, timestamp: new Date().toISOString() }]);
    setLoading(true);
    setStatusMsg("");

    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({ message: msg, mode: "ceo" }),
      });
      if (!resp.ok) {
        setMessages(prev => [...prev, { role: "system", text: "CEO sedang sibuk. Coba lagi nanti.", timestamp: new Date().toISOString() }]);
        setLoading(false);
        return;
      }

      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const json = await resp.json();
        setMessages(prev => [...prev, { role: "assistant", text: json.reply || "", sender: "CEO", timestamp: new Date().toISOString() }]);
        setLoading(false);
        return;
      }

      let currentSenderLocal = "CEO";
      setMessages(prev => [...prev, { role: "assistant", text: "", sender: "CEO", timestamp: new Date().toISOString() }]);
      let accumulated = "";
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";

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

            if (data.sender) { currentSenderLocal = data.sender; setCurrentSender(data.sender); senderRef.current = data.sender; }
            if (data.type === "meta" && data.sender) { setCurrentSender(data.sender); senderRef.current = data.sender; }

            if (data.type === "token" || data.type === "delta") {
              accumulated += data.token || data.delta || "";
              setMessages(prev => {
                const copy = [...prev]; const last = copy[copy.length - 1];
                if (last && last.role === "assistant") copy[copy.length - 1] = { ...last, text: accumulated, sender: currentSenderLocal };
                return copy;
              });
            }

            if (data.type === "done") {
              accumulated = data.finalText || accumulated;
              setMessages(prev => {
                const copy = [...prev]; const last = copy[copy.length - 1];
                if (last && last.role === "assistant") copy[copy.length - 1] = { ...last, text: accumulated, sender: currentSenderLocal };
                return copy;
              });
              break;
            }

            if (data.type === "status") {
              setStatusMsg(data.message || "");
              const m = data.message || String(data.state || "");
              if (m.length > 3 && !m.startsWith("✅ Misi")) {
                setMessages(prev => [...prev, { role: "system", text: `_${m}_`, timestamp: new Date().toISOString(), system: true, sender: data.source || "System" }]);
              }
              if (m.includes("Dispatching") || m.includes("Mendelegasikan")) setMissionPhase("dispatching");
              else if (m.includes("Synthesizing")) setSynthesis(s => ({ ...s, active: true }));
              if (data.state) {
                const st = String(data.state); const ci = st.indexOf(":");
                if (ci > 1) {
                  const execName = st.slice(0, ci).trim(); const execState = st.slice(ci + 1).trim();
                  setExecCards(prev => {
                    const ex = prev.findIndex(c => c.executive === execName);
                    if (ex >= 0) { const copy = [...prev]; copy[ex] = { ...copy[ex], status: execState }; return copy; }
                    return [...prev, { executive: execName, status: execState, progress: 0, duration: 0 }];
                  });
                  setTimeline(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), text: `${execName}: ${execState}` }]);
                }
              }
            }

            if (data.type === "execution_update") {
              setExecSnapshot(data);
              setMissionPhase("executing");
              if (data.owner && data.owner !== "Self") {
                setExecCards(prev => prev.map(c => c.executive === data.owner ? { ...c, progress: data.progress?.execution || 0 } : c));
              }
            }

            if (data.type === "tool") {
              setToolEvents(prev => [...prev.slice(-10), { name: data.payload?.name || data.event, status: data.event, durationMs: data.durationMs }]);
              setTimeline(prev => [...prev.slice(-19), { time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }), text: `⚙️ ${data.payload?.name || data.event}` }]);
            }

            if (data.type === "system") {
              setMessages(prev => [...prev, { role: "system", text: `_⚙️ Pipeline: ${data.payload?.state || ""}_`, timestamp: new Date().toISOString(), system: true, sender: "Pipeline" }]);
            }

            if (data.type === "runtime") {
              setMessages(prev => [...prev, { role: "system", text: `_🔀 ${data.runtime}: ${data.event} → ${data.payload?.to || ""}_`, timestamp: new Date().toISOString(), system: true, sender: data.runtime || "System" }]);
            }

            if (data.delta && !data.type) accumulated += data.delta;
            if (data.done && !data.type) {
              accumulated = data.finalText || accumulated;
              const s = senderRef.current || "CEO";
              setMessages(prev => {
                const copy = [...prev]; const last = copy[copy.length - 1];
                if (last && last.role === "assistant") copy[copy.length - 1] = { ...last, text: accumulated, sender: s };
                return copy;
              });
            }
          } catch {}
        }
      }
      setSynthesis(s => ({ ...s, active: false }));
      setMissionPhase("completed");
      setTimeout(() => { setExecCards([]); setMissionPhase("idle"); }, 3000);
      setExecSnapshot(null);
    } catch {
      setMessages(prev => [...prev, { role: "system", text: "Terjadi kesalahan koneksi. Coba lagi.", timestamp: new Date().toISOString() }]);
    }
    setLoading(false);
    setStatusMsg("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target; el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#0A1628]">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/5 flex items-center gap-2 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-sky-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white/90">Lume AI</h3>
          <p className="text-[10px] text-slate-400 dark:text-white/30">Executive Intelligence · CEO Runtime</p>
        </div>
        {health && (
          <div className="flex items-center gap-1.5 text-[10px] shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full ${health.ready ? "bg-green-500" : "bg-red-500"}`} />
            <span className="text-slate-400">{health.ready ? "Online" : "Degraded"}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 min-h-0">
        {messages.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <SiriWave />
            <p className="mt-2 text-xs text-slate-400 dark:text-white/40">Ketik perintah bisnis atau teknis</p>
            <p className="text-[10px] text-slate-300 dark:text-white/20 mt-0.5">CEO akan mengatur organisasi</p>
            <div className="flex flex-wrap justify-center gap-1.5 mt-3 max-w-[320px]">
              {QUICK_STARTS.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  className="px-2.5 py-1 text-[10px] rounded-lg border border-sky-200 dark:border-sky-500/15 bg-sky-50 dark:bg-sky-500/5 hover:bg-sky-100 dark:hover:bg-sky-500/10 transition-all text-slate-500 dark:text-slate-400">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m, i) => {
              if (m.role === "system") {
                return (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] text-slate-400 dark:text-white/30 py-0.5">
                    {m.sender && m.sender !== "System" && <MsgAvatar sender={m.sender} />}
                    <div>
                      {m.sender && <span className="font-medium mr-1">{m.sender}</span>}
                      <span className="italic">{m.text.replace(/^_|_$/g, "")}</span>
                    </div>
                  </div>
                );
              }
              const isUser = m.role === "user";
              return (
                <div key={i} className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                  <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-white/30 ${isUser ? "flex-row-reverse" : ""}`}>
                    {isUser ? <Zap className="w-3 h-3 text-sky-400" /> : <MsgAvatar sender={m.sender} />}
                    <span>{isUser ? "You" : m.sender || "CEO"}</span>
                    <span>·</span>
                    <span>{new Date(m.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  {isUser ? (
                    <div className="relative max-w-[85%] rounded-2xl px-3 py-2 text-sm bg-sky-500 text-white rounded-br-sm">
                      <p className="whitespace-pre-wrap leading-relaxed pr-5">{m.text}</p>
                      <div className="absolute bottom-1.5 right-1.5">
                        <CopyBtn text={m.text} className="text-white/40 hover:text-white/70" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full">
                      <MarkdownRenderer content={m.text} />
                      {m.text && (
                        <div className="flex justify-end mt-1">
                          <CopyBtn text={m.text} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {showMission && (
              <MissionActivityCard
                missionPhase={missionPhase} execCards={execCards} timeline={timeline}
                synthesis={synthesis} execSnapshot={execSnapshot} toolEvents={toolEvents}
                open={missionPanelOpen} onToggle={() => setMissionPanelOpen(!missionPanelOpen)} />
            )}
            {loading && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-white/30">
                  <MsgAvatar sender={currentSender || "CEO"} />
                  <span>{currentSender || "CEO"}</span>
                  <span>·</span>
                  <span>{new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-white/30 animate-pulse ml-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                  {statusMsg || "Memproses..."}
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      <div className="px-3 pb-3 pt-2 border-t border-slate-200 dark:border-white/5 shrink-0">
        <div className="flex items-end gap-2 bg-slate-100 dark:bg-white/5 rounded-2xl px-3 py-2">
          <textarea ref={inputRef} value={input} onChange={handleInput} onKeyDown={handleKeyDown}
            placeholder={loading ? "Memproses..." : "Ketik perintah..."} disabled={loading} rows={1}
            className="flex-1 bg-transparent text-sm outline-none resize-none text-slate-700 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 disabled:opacity-50 min-h-[32px] max-h-[120px]" />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center hover:bg-sky-600 active:scale-90 transition-all disabled:opacity-30 shrink-0 mb-0.5">
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
