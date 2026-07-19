import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Package,
  TrendingUp,
  Users,
  UserCog,
  Sparkles,
  Store,
  Settings,
  Monitor,
  Layers,
  Crown,
  Terminal,
  Zap,
  ArrowRight,
  Command,
} from "lucide-react";
import { appRegistry } from "@/lib/desktop/registry";
import { useDesktopStore } from "@/lib/desktop/store";
import { useWorkspaceStore } from "@/lib/desktop/workspace-store";
import { searchCommands, getCommands } from "@/lib/desktop/command-registry";
import type { CommandItem } from "@/lib/desktop/types";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Package, TrendingUp, Users, UserCog, Sparkles, Store, Settings,
  Monitor, Layers, Crown, Terminal, Zap, ShoppingBag: Package,
};

const categoryLabels: Record<string, string> = {
  applications: "Applications",
  workspaces: "Workspaces",
  actions: "Actions",
  ai: "AI",
  settings: "Settings",
  navigation: "Navigation",
  search: "Results",
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { openApp } = useDesktopStore();
  const { switchWorkspace } = useWorkspaceStore();

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const all = getCommands();
    if (!query.trim()) {
      setResults(all.slice(0, 20));
    } else {
      setResults(searchCommands(query).slice(0, 20));
    }
    setSelectedIndex(0);
  }, [query, isOpen]);

  const executeCommand = useCallback(
    (cmd: CommandItem) => {
      cmd.action();
      onClose();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        executeCommand(results[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, selectedIndex, executeCommand, onClose]
  );

  useEffect(() => {
    const el = listRef.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const grouped = results.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    const cat = cmd.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(cmd);
    return acc;
  }, {});

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[10001]"
            style={{ background: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-[15vh] left-1/2 -translate-x-1/2 z-[10002] w-full max-w-[560px]"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(10, 18, 35, 0.97)",
                backdropFilter: "blur(40px) saturate(200%)",
                border: "1px solid rgba(142, 216, 255, 0.12)",
                boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(142, 216, 255, 0.05)",
              }}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <Search className="w-4 h-4 text-white/30 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search apps, commands, workspaces..."
                  className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/25 outline-none"
                />
                <div className="flex items-center gap-1 text-[10px] text-white/20">
                  <kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10">ESC</kbd>
                </div>
              </div>

              {/* Results */}
              <div ref={listRef} className="max-h-[50vh] overflow-auto py-1">
                {results.length === 0 && query && (
                  <div className="px-4 py-8 text-center">
                    <p className="text-sm text-white/30">No results for "{query}"</p>
                  </div>
                )}

                {Object.entries(grouped).map(([category, commands]) => (
                  <div key={category}>
                    <div className="px-4 py-1.5">
                      <span className="text-[10px] font-semibold text-white/20 uppercase tracking-wider">
                        {categoryLabels[category] || category}
                      </span>
                    </div>
                    {commands.map((cmd) => {
                      const idx = results.indexOf(cmd);
                      const IconComp = iconMap[cmd.icon || ""] || Terminal;
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                            idx === selectedIndex
                              ? "bg-white/5 text-white/90"
                              : "text-white/50 hover:bg-white/[0.03]"
                          }`}
                        >
                          <IconComp className="w-4 h-4 shrink-0 text-white/30" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{cmd.label}</span>
                            {cmd.description && (
                              <span className="text-[11px] text-white/25 ml-2">
                                {cmd.description}
                              </span>
                            )}
                          </div>
                          {cmd.shortcut && (
                            <kbd className="text-[10px] text-white/20 px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                              {cmd.shortcut}
                            </kbd>
                          )}
                          <ArrowRight className="w-3 h-3 text-white/15" />
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-white/5 text-[10px] text-white/20">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Command className="w-3 h-3" /> K
                  </span>
                  <span>Command Center</span>
                </div>
                <span>{results.length} results</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
