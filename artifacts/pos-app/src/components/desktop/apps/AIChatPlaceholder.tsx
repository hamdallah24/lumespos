import { Sparkles, Send } from "lucide-react";
import { useState } from "react";

export default function AIChatPlaceholder() {
  const [message, setMessage] = useState("");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-sky-500/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white/90">Lume AI</h3>
          <p className="text-[10px] text-white/30">Executive Intelligence</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-sky-400" />
        </div>
        <p className="text-sm text-white/50 text-center max-w-[240px]">
          AI Assistant will be connected to Executive Runtime and business intelligence.
        </p>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask Lume AI..."
            className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/20 outline-none"
          />
          <button className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary/60 hover:text-primary transition-colors cursor-pointer">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
