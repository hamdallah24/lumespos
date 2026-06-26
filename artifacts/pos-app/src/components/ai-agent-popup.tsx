import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Briefcase, MessageSquare, Code, Server, Copy, Check } from "lucide-react";
import { apiFetch, getCsrfToken } from "@/lib/csrf";

type Mode = "bisnis" | "chat" | "cto" | "vps";

type Message = {
  role: "user" | "assistant";
  text: string;
  showApproval?: boolean;
};

const MODE_TABS: { key: Mode; label: string; icon: React.ElementType }[] = [
  { key: "bisnis", label: "Bisnis", icon: Briefcase },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "cto", label: "CTO", icon: Code },
  { key: "vps", label: "VPS", icon: Server },
];

const BISNIS_GROUPS = [
  {
    key: "stok", label: "📦 Stok",
    items: [
      { label: "Tambah Stok", text: "tambah stok  " },
      { label: "Kurangi", text: "kurangi stok " },
      { label: "Koreksi Jumlah", text: "koreksi stok  jadi " },
      { label: "Koreksi Hilang", text: "koreksi hilang  " },
      { label: "Lihat Semua", text: "lihat stok" },
      { label: "Cek Menipis", text: "cek stok menipis" },
    ]
  },
  {
    key: "menu", label: "📋 Menu",
    items: [
      { label: "Tambah + Varian", text: "tambah menu  varian: " },
      { label: "Lihat Menu", text: "lihat menu" },
      { label: "Ubah Harga", text: "ubah harga  jadi " },
      { label: "Hapus", text: "hapus " },
    ]
  },
  {
    key: "keuangan", label: "💰 Keuangan",
    items: [
      { label: "Catat Pengeluaran", text: "catat pengeluaran: " },
      { label: "Laporan Hari Ini", text: "laporan hari ini" },
      { label: "Laporan 7 Hari", text: "laporan 7 hari" },
      { label: "Laporan Bulan Ini", text: "laporan bulan ini" },
    ]
  },
  {
    key: "produksi", label: "🏭 Produksi",
    items: [
      { label: "Mulai Produksi", text: "produksi " },
      { label: "Lihat Resep", text: "lihat resep " },
    ]
  },
];

const MODE_SHORTCUTS: Record<Mode, { label: string; text: string }[]> = {
  bisnis: [],
  chat: [
    { label: "Kasih ide menu", text: "ide menu minuman yg lagi ngetren" },
    { label: "Tips bisnis", text: "gimana cara naikin omzet?" },
    { label: "Resep", text: "resep minuman simples buat jualan" },
    { label: "Ngobrol aja", text: "lagi apa nih?" },
  ],
  cto: [
    { label: "Tambah fitur", text: "tambah fitur laporan excel" },
    { label: "Analisis kode", text: "analisis struktur folder frontend" },
    { label: "Baca file", text: "baca package.json" },
    { label: "Optimasi", text: "gimana cara ningkatin performa?" },
  ],
  vps: [
    { label: "Deploy", text: "deploy terbaru" },
    { label: "Status", text: "status server" },
    { label: "Restart", text: "restart api" },
    { label: "Logs", text: "logs terbaru" },
    { label: "Health", text: "health check" },
  ],
};

const MODE_DESC: Record<Mode, string> = {
  bisnis: "Tanya stok, menu, laporan, pengeluaran",
  chat: "Ngobrol santai, brainstorming, resep",
  cto: "Fitur baru, baca file, analisis kode",
  vps: "Deploy, status, restart, logs server",
};

function SiriWave() {
  return (
    <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border border-[#1565FF]/30"
          initial={{ opacity: 0.5, scale: 0.8 }}
          animate={{
            opacity: [0.5, 0.1, 0.5],
            scale: [0.8, 1.3, 0.8],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            delay: i * 0.4,
            ease: "easeInOut",
          }}
        />
      ))}
      <motion.div
        className="w-16 h-16 rounded-full bg-gradient-to-br from-[#1565FF] to-[#0A4CD0] flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#1565FF]/40"
        animate={{
          scale: [1, 1.08, 1],
          boxShadow: [
            "0 0 20px rgba(21,101,255,0.3)",
            "0 0 40px rgba(21,101,255,0.5)",
            "0 0 20px rgba(21,101,255,0.3)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Bot size={28} />
      </motion.div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-[#1565FF]/60"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

export function AiAgentPopup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = React.useState<Mode>("bisnis");
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const lastMsgRef = React.useRef("");
  const approvalMsgRef = React.useRef("");

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    lastMsgRef.current = msg;
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    // CTO mode → streaming
    if (mode === "cto") {
      setMessages((prev) => [...prev, { role: "assistant", text: "" }]);
      let finalText = "";
      try {
        const resp = await fetch("/api/ai/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
          body: JSON.stringify({ message: msg, mode }),
        });
        if (!resp.ok) {
          setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: "BANG sedang sibuk." }]; });
          setLoading(false);
          return;
        }
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
              if (data.done) { finalText = data.finalText || data.text || ""; break; }
              if (data.text) {
                setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", text: data.text }; return copy; });
              }
            } catch { /* skip */ }
          }
        }
      } catch {
        setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: "Maaf, terjadi kesalahan." }]; });
      }
      // Detect approval needed (contains SETUJU and TIDAK SETUJU) and original was code gen request
      const needsApproval = /SETUJU/i.test(finalText) && /TIDAK\s*SETUJU/i.test(finalText);
      if (needsApproval) approvalMsgRef.current = msg;
      setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { ...copy[copy.length - 1], showApproval: needsApproval }; return copy; });
      setLoading(false);
      return;
    }

    try {
      const res = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, mode }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) => [...prev, { role: "assistant", text: err.error || "Terjadi kesalahan." }]);
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Maaf, terjadi kesalahan. Coba lagi." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    const msg = approvalMsgRef.current || lastMsgRef.current;
    setMessages((prev) => [...prev, { role: "user", text: "✅ SETUJU — generate kode..." }]);
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      const resp = await fetch("/api/ai/chat", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
        body: JSON.stringify({ message: msg, mode: "cto", generateNow: true }),
      });
      if (!resp.ok) {
        setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: "Gagal menghubungi server." }]; });
        setLoading(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      const steps: string[] = [];
      let finalReply = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.step === "final") {
              finalReply = evt.detail;
            } else if (evt.step === "done") {
              steps.push(evt.detail);
              setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", text: steps.join("\n") }; return copy; });
            } else if (evt.step !== "retry") {
              steps.push(evt.detail);
              setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", text: steps.join("\n") }; return copy; });
            }
          } catch { /* skip */ }
        }
      }

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", text: finalReply || steps.join("\n") || "Selesai — cek hasil di GitHub." };
        return copy;
      });
    } catch (e: any) {
      setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: `Maaf, gagal generate kode.${e?.message ? ` (${e.message.slice(0, 80)})` : ""}` }]; });
    }
    setLoading(false);
  };

  const handleReject = () => {
    setMessages((prev) => [...prev, { role: "user", text: "❌ TIDAK SETUJU" }, { role: "assistant", text: "Baik bos, generate kode dibatalkan. Ada hal lain yg bisa dibantu?" }]);
    approvalMsgRef.current = "";
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setMessages([]);
  };

  const handleCopy = (text: string, index: number) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative w-[calc(100%-32px)] sm:max-w-md max-h-[85vh] bg-gradient-to-b from-[#F8FBFC]/95 via-white/95 to-white/95 dark:from-[#071426]/95 dark:via-[#0A1F44]/95 dark:to-[#071426]/95 backdrop-blur-2xl border border-[#1565FF]/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[#1565FF]/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1565FF] to-[#0A4CD0] flex items-center justify-center text-white font-bold text-xs shadow-md">
                  AI
                </div>
                <div>
                  <span className="font-semibold text-sm text-slate-800 dark:text-white">
                    AI {MODE_TABS.find((t) => t.key === mode)?.label}
                  </span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{MODE_DESC[mode]}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl hover:bg-[#1565FF]/5 active:scale-90 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex gap-1 px-4 pt-3 pb-1 overflow-x-auto">
              {MODE_TABS.map((tab) => {
                const active = mode === tab.key;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => switchMode(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all active:scale-95 ${
                      active
                        ? "bg-[#1565FF] text-white shadow-sm"
                        : "text-slate-500 dark:text-slate-400 hover:bg-[#1565FF]/5"
                    }`}
                  >
                    <Icon size={13} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3 min-h-0">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-2 text-center">
                  <SiriWave />
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{MODE_DESC[mode]}</p>

                  {mode === "bisnis" ? (
                    <div className="w-full">
                      <div className="flex flex-wrap justify-center gap-2 mb-3">
                        {BISNIS_GROUPS.map((group) => (
                          <button
                            key={group.key}
                            onClick={() => setOpenGroup(openGroup === group.key ? null : group.key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all active:scale-95 whitespace-nowrap ${
                              openGroup === group.key
                                ? "bg-[#1565FF] text-white shadow-sm"
                                : "bg-[#1565FF]/10 text-[#1565FF] hover:bg-[#1565FF]/20"
                            }`}
                          >
                            {group.label}
                          </button>
                        ))}
                      </div>
                      {BISNIS_GROUPS.filter(g => g.key === openGroup).map((group) => (
                        <div key={group.key} className="flex flex-wrap justify-center gap-1.5 px-1 pb-1">
                          {group.items.map((item, j) => (
                            <button
                              key={j}
                              onClick={() => { setInput(item.text); inputRef.current?.focus(); setOpenGroup(null); }}
                              className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-[#1565FF]/15 bg-white dark:bg-white/[0.05] hover:bg-[#1565FF]/5 active:scale-95 transition-all text-slate-600 dark:text-slate-300 whitespace-nowrap"
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap justify-center gap-2">
                      {MODE_SHORTCUTS[mode].map((s, i) => (
                        <button
                          key={i}
                          onClick={() => { setInput(s.text); inputRef.current?.focus(); }}
                          className="px-3.5 py-2 text-xs font-medium rounded-xl border border-[#1565FF]/15 bg-[#1565FF]/5 hover:bg-[#1565FF]/10 active:scale-95 transition-all text-slate-600 dark:text-slate-300 whitespace-nowrap"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messages.map((msg, i) => {
                const isLast = i === messages.length - 1;
                const showDots = (loading && isLast && msg.role === "assistant" && !msg.text);
                
                return (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`flex gap-2.5 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
                        msg.role === "user"
                          ? "bg-[#1565FF]/10 text-[#1565FF]"
                          : "bg-gradient-to-br from-[#1565FF] to-[#0A4CD0] text-white"
                      }`}
                    >
                      {msg.role === "user" ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative group overflow-hidden ${
                        msg.role === "user"
                          ? "bg-[#1565FF] text-white rounded-tr-md"
                          : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-tl-md pb-8"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div>
                          {(msg.text || "").split("\n\n").map((block, j) => {
                            const isThinking = block.startsWith("[BERPIKIR]:");
                            const isName = /^\[\w+\] —/.test(block);
                            if (isThinking) {
                              return <div key={j} className="italic text-[11px] text-slate-400 dark:text-slate-500 py-1 px-2 bg-slate-200/50 dark:bg-white/[0.04] rounded-lg mb-2 border-l-2 border-[#1565FF]/20">{block}</div>;
                            }
                            if (isName) {
                              return <div key={j} className="pt-1 pb-1"><span className="font-bold text-[#1565FF]">{block.split(":")[0]}</span><span className="text-slate-400 dark:text-slate-500">:</span><br /><span className="whitespace-pre-wrap">{block.slice(block.indexOf(":") + 1).trim()}</span></div>;
                            }
                            return <div key={j} className="whitespace-pre-wrap">{block}</div>;
                          })}
                        </div>
                      ) : (
                        msg.text
                      )}
                      {showDots && <LoadingDots />}
                      {msg.role === "assistant" && (
                        <button
                          onClick={() => handleCopy(msg.text, i)}
                          className="absolute right-2 bottom-1.5 w-6 h-6 rounded-lg hover:bg-[#1565FF]/10 flex items-center justify-center text-slate-400 hover:text-[#1565FF] transition-colors active:scale-90"
                        >
                          {copiedIndex === i ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                      )}
                      {msg.role === "assistant" && msg.showApproval && (
                        <div className="flex gap-2 mt-3 pt-2 border-t border-[#1565FF]/10">
                          <button onClick={handleApprove} className="flex-1 py-2 px-3 rounded-xl bg-green-500 text-white text-xs font-semibold hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center gap-1">
                            ✅ SETUJU — Generate Kode
                          </button>
                          <button onClick={handleReject} className="flex-1 py-2 px-3 rounded-xl bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold hover:bg-red-200 dark:hover:bg-red-500/20 active:scale-95 transition-all">
                            ❌ TIDAK SETUJU
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#1565FF] to-[#0A4CD0] flex items-center justify-center text-white shrink-0 mt-1">
                      <Bot size={14} />
                    </div>
                    <div className="rounded-2xl bg-slate-100 dark:bg-white/5 rounded-tl-md">
                      <LoadingDots />
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            <div className="px-4 pb-4 pt-2 border-t border-[#1565FF]/10">
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-2xl px-4 py-2.5">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Tanya AI ${MODE_TABS.find((t) => t.key === mode)?.label}...`}
                  className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none min-w-0"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-xl bg-[#1565FF] text-white flex items-center justify-center hover:bg-[#1565FF]/90 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
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
