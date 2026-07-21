import React, { useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import { LayoutGrid, Plus, ChevronDown } from "lucide-react";

interface WorkspaceItem {
  id: string;
  name: string;
  description?: string;
}

interface WorkspaceSwitcherProps {
  workspaces?: WorkspaceItem[];
  onNewWorkspace?: () => void;
  className?: string;
}

export default function WorkspaceSwitcher({
  workspaces = [],
  onNewWorkspace,
  className = "",
}: WorkspaceSwitcherProps) {
  const { state, setWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === state.workspaceId) || {
    id: "main",
    name: state.workspaceName || "Main Workspace",
  };

  const toggle = () => setOpen((v) => !v);
  const close = () => setOpen(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggle}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors w-full"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
          {currentWorkspace.name.charAt(0).toUpperCase()}
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{currentWorkspace.name}</div>
          <div className="text-[10px] text-muted-foreground">{state.scenario} · {state.executiveRuntime.toUpperCase()}</div>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg p-1.5 z-50">
            {workspaces.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">Tidak ada workspace</div>
            )}
            {workspaces.map((w) => (
              <button
                key={w.id}
                onClick={() => { setWorkspace(w.id, w.name); close(); }}
                className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm ${
                  state.workspaceId === w.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"
                }`}
              >
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold">
                  {w.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate">{w.name}</div>
                  {w.description && <div className="text-[10px] text-muted-foreground truncate">{w.description}</div>}
                </div>
              </button>
            ))}
            {onNewWorkspace && (
              <button
                onClick={() => { onNewWorkspace(); close(); }}
                className="w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm text-muted-foreground hover:bg-muted/50 border-t border-border mt-1"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Workspace Baru</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
