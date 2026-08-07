// ResolvedConfigurationViewer — visualizes inheritance from Resolver.trace().
// This component NEVER computes inheritance. It renders the trace steps exactly
// as the Resolver returns them (DEFAULT → WORKSPACE → BRANCH → EXECUTIVE), each
// annotated with source, inherited flag, and effective value.

import type { ResolvedValue } from "../api";

const SCOPE_LABELS: Record<string, string> = {
  default: "DEFAULT",
  workspace: "WORKSPACE",
  branch: "BRANCH",
  executive: "EXECUTIVE",
};

interface Props {
  key: string;
  trace: ResolvedValue[];
  loading?: boolean;
}

export default function ResolvedConfigurationViewer({ key, trace, loading }: Props) {
  if (loading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Resolving trace…</div>;
  }
  if (!trace || trace.length === 0) {
    return <div className="text-sm text-muted-foreground">No trace available for "{key}".</div>;
  }

  const effective = trace[trace.length - 1];

  return (
    <div className="space-y-1">
      {trace.map((step, i) => {
        const isLast = i === trace.length - 1;
        const isEffective = isLast && !step.inherited;
        return (
          <div key={`${step.source.type}-${i}`} className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center rounded-md w-24 h-7 text-[11px] font-semibold ${
                isEffective ? "bg-primary/15 text-primary" : step.inherited ? "bg-muted/50 text-muted-foreground" : "bg-primary/80 text-white"
              }`}
            >
              {SCOPE_LABELS[step.source.type] ?? step.source.type.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-mono truncate text-foreground">
                {typeof step.value === "object" ? JSON.stringify(step.value) : String(step.value)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {step.inherited ? "inherited (fallback)" : "provided here"}
                {step.source.workspaceId ? ` · ws:${step.source.workspaceId}` : ""}
                {step.source.branchId ? ` · branch:${step.source.branchId}` : ""}
                {step.source.executiveRole ? ` · ${step.source.executiveRole}` : ""}
              </div>
            </div>
            {isLast && <span className="text-[10px] font-semibold text-primary whitespace-nowrap">EFFECTIVE</span>}
          </div>
        );
      })}

      <div className="pt-2 text-[11px] text-muted-foreground border-t border-border/60">
        Effective value for <span className="font-mono text-foreground">{key}</span> comes from{" "}
        <span className="font-semi semibold text-foreground">{SCOPE_LABELS[effective.source.type] ?? effective.source.type}</span>.
        Source of inheritance and effective resolution is always Resolver.trace().
      </div>
    </div>
  );
}