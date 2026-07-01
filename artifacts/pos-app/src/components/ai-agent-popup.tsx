// ECP-009: Quick Executive Command — simplified popup
// Single command mode. Full workspace at /executive

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Zap, Copy, Check } from "lucide-react";
import { getCsrfToken } from "@/lib/csrf";

type Message = {
  role: "user" | "assistant";
  text: string;
};

const EXECUTIVE_SHORTCUTS = [
  "📊 Laporan penjualan hari ini",
  "🔧 Ada bug di inventory",
  "📋 Cek mission aktif",
  "💡 Optimasi performa",
];

function SiriWave() {
  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 rounded-full bg-[#1565FF]/20"
          style={{ bottom: "50%", left: `${35 + i * 6}%`, height: "40px", transformOrigin: "bottom center" }}
          animate={{ scaleY: [0.2, 1.5, 0.2], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 0.8 + i * 0.1, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export function AiAgentPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [statusMsg, setStatusMsg] = React.useState("");
  const [readiness, setReadiness] = React.useState<{ ready: boolean; passed: number; failed: number } | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) return;
    fetch("/api/ai/readiness-public").then(r => r.json()).then(setReadiness).catch(() => {});
  }, [open]);

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
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({ message: msg, mode: "cto" }),
      });

      if (!resp.ok) {
        setMessages((prev) => [...prev, { role: "assistant", text: "CTO sedang sibuk. Coba lagi." }]);
        setLoading(false);
        return;
      }

      const ct = resp.headers.get("content-type") || "";
      if (ct.includes("json")) {
        const json = await resp.json();
        setMessages((prev) => [...prev, { role: "assistant", text: json.reply || "" }]);
        setLoading(false);
        return;
      }

      // SSE stream
      setMessages((prev) => [...prev, { role: "assistant", text: "" }]);
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
            if (data.type === "status") { setStatusMsg(data.message); continue; }
            if (data.type === "delta") { accumulated += data.delta; }
            if (data.type === "done") { accumulated = data.finalText || accumulated; break; }
            if (data.delta) accumulated += data.delta;
            if (data.done) { accumulated = data.finalText || ""; break; }
          } catch {}
        }
        if (accumulated) {
          setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { ...copy[copy.length - 1], text: accumulated }; return copy; });
        }
      }
    } catch {
      setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: "Maaf, terjadi kesalahan." }]; });
    }
    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-[calc(100%-32px)] sm:max-w-md max-h-[85vh] bg-gradient-to-b from-[#F8FBFC]/95 via-white/95 to-white/95 dark:from-[#071426]/95 dark:via-[#0A1F44]/95 dark:to-[#071426]/95 backdrop-blur-2xl border border-[#1565FF]/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#1565FF]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1565FF] to-[#0A4CD0] flex items-center justify-center text-white font-bold text-xs shadow-md">
                  <Zap size={16} />
                </div>
                <div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-white">Executive Command</span>
                  {readiness && (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className={`w-1.5 h-1.5 rounded-full ${readiness.ready ? "bg-green-500" : "bg-red-500"}`} />
                      {readiness.ready ? "Healthy" : "Degraded"} · {readiness.passed}/{readiness.passed + readiness.failed} tests
                    </div>
                  )}
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-[#1565FF]/5 active:scale-90 transition-all flex items-center justify-center text-slate-500">
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0">
              {statusMsg && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1565FF]/5 border border-[#1565FF]/10 text-xs text-slate-500 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1565FF] animate-ping" /> {statusMsg}
                </div>
              )}
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <SiriWave />
                  <p className="mt-2 text-xs text-slate-400">Quick Executive Command</p>
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {EXECUTIVE_SHORTCUTS.map((s, i) => (
                      <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                        className="px-3 py-1.5 text-[11px] rounded-lg border border-[#1565FF]/15 bg-white dark:bg-white/[0.03] hover:bg-[#1565FF]/5 transition-all text-slate-500">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => {
                const [copied, setCopied] = React.useState(false);
                const copy = (text: string) => {
                  navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
                };
                const isUser = m.role === "user";

                return (
                <div key={i} className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
                  {/* Icon on top */}
                  <div className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${isUser ? "flex-row-reverse" : ""}`}>
                    {isUser ? <Zap className="w-3 h-3 text-[#1565FF]" /> : <Zap className="w-3 h-3 text-[#1565FF]" />}
                    <span>{isUser ? "You" : "CTO"}</span>
                  </div>
                  {/* Wide bubble */}
                  <div className={`relative max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm ${
                    isUser
                      ? "bg-[#1565FF] text-white rounded-br-sm"
                      : "bg-slate-50 dark:bg-white/[0.03] border border-[#1565FF]/5 text-slate-700 dark:text-white rounded-bl-sm"
                  }`}>
                    <p className="whitespace-pre-wrap leading-relaxed pr-6">{m.text || (loading && i === messages.length - 1 ? "..." : "")}</p>
                    {m.text && m.text.length > 0 && (
                      <button onClick={() => copy(m.text)} className={`absolute bottom-2 right-2 w-6 h-6 rounded-md flex items-center justify-center transition-all active:scale-90 ${isUser ? "text-white/50 hover:text-white/80" : "text-slate-300 hover:text-slate-500"}`}>
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    )}
                  </div>
                </div>
              );})}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 border-t border-[#1565FF]/10">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-2xl px-4 py-2.5">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={loading ? "Memproses..." : "Quick command..."}
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-white placeholder:text-slate-400 disabled:opacity-50"
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-[#1565FF] text-white flex items-center justify-center hover:bg-[#1565FF]/90 active:scale-90 transition-all disabled:opacity-30 shrink-0">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
