import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Bot, User } from "lucide-react";
import { apiFetch } from "@/lib/csrf";

type Message = {
  role: "user" | "assistant";
  text: string;
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
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
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
                <span className="font-semibold text-sm text-slate-800 dark:text-white">AI Agent</span>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl hover:bg-[#1565FF]/5 active:scale-90 transition-all flex items-center justify-center text-slate-500 dark:text-slate-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
              {messages.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <SiriWave />
                  <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                    Tanya apa saja tentang bisnis Anda
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Ketik pertanyaan untuk memulai
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
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
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#1565FF] text-white rounded-tr-md"
                          : "bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-tl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}

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
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Tanya AI Agent..."
                  className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none min-w-0"
                />
                <button
                  onClick={sendMessage}
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
