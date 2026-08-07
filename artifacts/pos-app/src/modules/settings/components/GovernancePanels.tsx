// GovernancePanels — Preview / Diff / Simulation / Impact / Policy.
// Before any commit, the UI runs pipeline.plan() endpoints and displays every
// panel. Commit only happens after the user confirms — never before panels load.

import { useMemo } from "react";
import type {
  ConfigScope,
  ConfigValue,
  ImpactResponse,
  PolicyResponse,
  PreviewResponse,
  SimulateItem,
} from "../api";

export interface GovernanceResult {
  preview: PreviewResponse | null;
  simulation: SimulateItem[] | null;
  impact: ImpactResponse | null;
  policy: PolicyResponse | null;
  loading: boolean;
  error: string | null;
}

export function DiffTable({ before, after }: { before: Record<string, ConfigValue>; after: Record<string, ConfigValue> }) {
  const keys = useMemo(() => Object.keys(after), [after]);
  return (
    <div className="divide-y divide-border/60 rounded-lg border border-border overflow-hidden">
      {keys.map((k) => {
        const b = before[k];
        const a = after[k];
        const changed = JSON.stringify(b) !== JSON.stringify(a);
        return (
          <div key={k} className="grid grid-cols-3 gap-2 px-3 py-2 text-sm bg-card/40">
            <span className="font-mono text-xs text-foreground truncate">{k}</span>
            <span className={`font-mono text-xs truncate ${changed ? "text-destructive line-through" : "text-muted-foreground"}`}>
              {b == null ? "—" : typeof b === "object" ? JSON.stringify(b) : String(b)}
            </span>
            <span className={`font-mono text-xs truncate ${changed ? "text-emerald-500" : "text-muted-foreground"}`}>
              {a == null ? "—" : typeof a === "object" ? JSON.stringify(a) : String(a)}
            </span>
          </div>
        );
      })}
      {keys.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">No changes</div>}
    </div>
  );
}

export default function GovernancePanels({ result, scope }: { result: GovernanceResult; scope: ConfigScope }) {
  if (result.loading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Evaluating governance gates…</div>;
  }
  if (result.error) {
    return <div className="text-sm text-destructive">{result.error}</div>;
  }
  if (!result.preview && !result.simulation && !result.impact && !result.policy) {
    return <div className="text-sm text-muted-foreground">Nothing to preview yet.</div>;
  }

  const policyOk = result.policy?.ok ?? false;

  return (
    <div className="space-y-4">
      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Diff (before → after)</h4>
        {result.preview ? <DiffTable before={result.preview.before} after={result.preview.after} /> : <div className="text-sm text-muted-foreground">—</div>}
      </section>

      {result.simulation && result.simulation.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Simulation</h4>
          <ul className="space-y-1">
            {result.simulation.map((s) => (
              <li key={s.key} className="rounded-lg border border-border bg-card/40 px-3 py-2 text-sm">
                <span className="font-mono text-xs text-foreground">{s.key}</span>
                <span className={`ml-2 text-[10px] font-semibold uppercase ${s.confidence === "high" ? "text-emerald-500" : s.confidence === "medium" ? "text-amber-500" : "text-muted-foreground"}`}>
                  {s.confidence}
                </span>
                <p className="text-xs text-muted-foreground mt-0.5">{s.estimate}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.impact && result.impact.impacted.length > 0 && (
        <section>
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Impacted Subsystems</h4>
          <div className="flex flex-wrap gap-1.5">
            {result.impact.impacted.map((id) => (
              <span key={id} className="rounded-full bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground">{id}</span>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Policy</h4>
        <div className={`rounded-lg border px-3 py-2 text-sm ${policyOk ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
          {policyOk ? "Allowed — this change is permitted at the selected scope." : `Denied: ${result.policy?.reason ?? "insufficient permission"}`}
        </div>
      </section>
    </div>
  );
}