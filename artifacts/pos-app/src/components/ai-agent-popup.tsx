import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User, Briefcase, MessageSquare, Code, Copy, Check } from "lucide-react";
import { apiFetch, getCsrfToken } from "@/lib/csrf";

type Mode = "bisnis" | "chat" | "cto";

type Message = {
  role: "user" | "assistant";
  text: string;
  showApproval?: boolean;
  approvalContext?: string;
  showMerge?: boolean;
};

const MODE_TABS: { key: Mode; label: string; icon: React.ElementType }[] = [
  { key: "bisnis", label: "Bisnis", icon: Briefcase },
  { key: "chat", label: "Chat", icon: MessageSquare },
  { key: "cto", label: "CTO", icon: Code },
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
    { label: "Status Server", text: "status server" },
    { label: "Restart", text: "restart api" },
    { label: "Logs", text: "logs terbaru" },
    { label: "Health", text: "health check" },
  ],
};

const MODE_DESC: Record<Mode, string> = {
  bisnis: "Tanya stok, menu, laporan, pengeluaran",
  chat: "Ngobrol santai, brainstorming, resep",
  cto: "Fitur baru, baca file, analisis kode, server",
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
  const [statusMsg, setStatusMsg] = React.useState("");
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);
  const [checkedMap, setCheckedMap] = React.useState<Record<string, boolean>>({});

  // Load checklist dari DB
  React.useEffect(() => {
    if (open && mode === "cto") {
      fetch(`/api/ai/checklist?mode=cto`, { credentials: "include" })
        .then(r => r.json())
        .then(data => {
          if (data.items?.length > 0) {
            const m: Record<string, boolean> = {};
            data.items.forEach((item: any) => { m[item.itemKey] = item.checked; });
            setCheckedMap(m);
          }
        })
        .catch(() => {});
    }
  }, [open, mode]);

  // Save toggle ke DB
  const toggleCheckbox = (key: string, newVal: boolean, convKey?: string) => {
    setCheckedMap(prev => ({ ...prev, [key]: newVal }));
    fetch("/api/ai/checklist/toggle", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
      body: JSON.stringify({ itemKey: key, checked: newVal, text: convKey || key, mode: "cto" }),
    }).catch(() => {});
  };
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);


  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    // CTO mode → streaming (with tool pre-fetch in backend)
    if (mode === "cto") {
      setMessages((prev) => [...prev, { role: "assistant", text: "" }]);
      let accumulated = "";
      try {
        const resp = await fetch("/api/ai/chat", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
          body: JSON.stringify({ message: msg, mode }),
        });
        if (!resp.ok) {
          const errText = await resp.text().catch(() => "");
          console.error("[ai-popup] CTO HTTP", resp.status, errText.slice(0, 200));
          setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: "BANG sedang sibuk." }]; });
          setLoading(false);
          return;
        }
        // Detect JSON response (not SSE) — e.g. "setuju" check
        const ct = resp.headers.get("content-type") || "";
        if (ct.includes("json")) {
          const json = await resp.json();
          accumulated = json.reply || json.error || "";
          setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", text: accumulated }; return copy; });
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
              // New typed events
              if (data.type === "status") {
                setStatusMsg(data.message);
                continue;
              }
              if (data.type === "delta") {
                accumulated += data.delta;
                setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", text: accumulated }; return copy; });
                continue;
              }
              if (data.type === "done") {
                accumulated = data.finalText || accumulated;
                break;
              }
              // Legacy fallback
              if (data.done) { accumulated = data.finalText || ""; break; }
              if (data.delta) {
                accumulated += data.delta;
                setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", text: accumulated }; return copy; });
              }
            } catch (e) { console.error("[ai-popup] SSE parse:", e); }
          }
        }
      } catch (e) {
        console.error("[ai-popup] CTO stream error:", e);
        setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: "Maaf, terjadi kesalahan." }]; });
      }
      const needsApproval = /SETUJU/i.test(accumulated) && /TIDAK\s*SETUJU/i.test(accumulated);
      setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { ...copy[copy.length - 1], showApproval: needsApproval, approvalContext: needsApproval ? msg : undefined }; return copy; });
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
        const errText = await res.text().catch(() => "");
        console.error("[ai-popup] API HTTP", res.status, errText.slice(0, 200));
        setMessages((prev) => [...prev, { role: "assistant", text: errText || "Terjadi kesalahan." }]);
        return;
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (e) {
      console.error("[ai-popup] API error:", e);
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
    const lastMsg = messages.filter(m => m.role === "assistant").pop();
    const msg = lastMsg?.approvalContext || messages.filter(m => m.role === "user").pop()?.text || "";
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
        const errText = await resp.text().catch(() => "");
        console.error("[ai-popup] approve HTTP", resp.status, errText.slice(0, 200));
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
          } catch (e) { console.error("[ai-popup] approve SSE parse:", e); }
        }
      }

      setMessages((prev) => {
        const copy = [...prev];
        const finalText = finalReply || steps.join("\n") || "Selesai — cek hasil di GitHub.";
        copy[copy.length - 1] = { role: "assistant", text: finalText, showMerge: /✅.*committed|sukses|berhasil/i.test(finalText) };
        return copy;
      });
    } catch (e: any) {
      console.error("[ai-popup] approve error:", e);
      setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: `Maaf, gagal generate kode.${e?.message ? ` (${e.message.slice(0, 80)})` : ""}` }]; });
    }
    setLoading(false);
  };

  const handleReject = () => {
    setMessages((prev) => [...prev, { role: "user", text: "❌ TIDAK SETUJU" }, { role: "assistant", text: "Baik bos, generate kode dibatalkan. Ada hal lain yg bisa dibantu?" }]);
  };

  const handleMerge = async () => {
    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: "🔄 Merge & Deploy → Main" }, { role: "assistant", text: "" }]);
    try {
      const resp = await fetch("/api/ai/deploy-merge", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() || "" },
      });
      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error("[ai-popup] merge HTTP", resp.status, errText.slice(0, 200));
        setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: "Gagal merge." }]; }); setLoading(false); return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = ""; let finalReply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.step === "final") finalReply = evt.detail;
            else setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", text: evt.detail }; return copy; });
            } catch (e) { console.error("[ai-popup] merge SSE parse:", e); }
        }
      }
      setMessages((prev) => { const copy = [...prev]; copy[copy.length - 1] = { role: "assistant", text: finalReply }; return copy; });
    } catch (e) {
      console.error("[ai-popup] merge error:", e);
      setMessages((prev) => { const copy = [...prev]; copy.pop(); return [...copy, { role: "assistant", text: "Maaf, gagal merge." }]; });
    }
    setLoading(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setMessages([]);
    setStatusMsg("");
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
              {statusMsg && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1565FF]/5 border border-[#1565FF]/10 text-xs text-slate-500 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1565FF] animate-ping" />
                  {statusMsg}
                </div>
              )}
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
                            // Render checklist items
                            const lines = block.split("\n");
                            const rendered: React.ReactNode[] = [];
                            for (let li = 0; li < lines.length; li++) {
                              const line = lines[li];
                              const checkMatch = line.match(/^(\s*)\[([ x])\]\s*(\d+\.?\s*)?(.+)/);
                              if (checkMatch) {
                                const indent = checkMatch[1];
                                const checked = checkMatch[2] === "x";
                                const num = checkMatch[3] || "";
                                const text = checkMatch[4];
                                const key = `check-${i}-${j}-${li}`;
                                const toggled = checkedMap[key] ?? checked;
                                rendered.push(
                                  <button key={key} onClick={() => toggleCheckbox(key, !toggled)}
                                    className="flex items-start gap-2 w-full text-left py-0.5 group active:scale-[0.98] transition-transform"
                                  >
                                    <span className={`mt-0.5 w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center text-[10px] font-bold transition-all ${
                                      toggled ? "bg-green-500 border-green-500 text-white" : "border-slate-300 dark:border-slate-600 group-hover:border-[#1565FF]/50"
                                    }`}>
                                      {toggled ? "✓" : ""}
                                    </span>
                                    <span className={`whitespace-pre-wrap ${toggled ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-700 dark:text-slate-300"}`}>
                                      {num}{text}
                                    </span>
                                  </button>
                                );
                              } else {
                                rendered.push(<div key={`line-${i}-${j}-${li}`} className="whitespace-pre-wrap">{line}</div>);
                              }
                            }
                            return rendered;
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
                      {msg.role === "assistant" && msg.showMerge && (
                        <div className="flex gap-2 mt-3 pt-2 border-t border-[#1565FF]/10">
                          <button onClick={handleMerge} disabled={loading} className="flex-1 py-2 px-3 rounded-xl bg-[#1565FF] text-white text-xs font-semibold hover:bg-[#1565FF]/90 active:scale-95 transition-all flex items-center justify-center gap-1">
                            🔄 Merge & Deploy → Main
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
