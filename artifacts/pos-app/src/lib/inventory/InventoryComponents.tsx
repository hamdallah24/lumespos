import { ReactNode } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, AlertTriangle, Loader2 } from "lucide-react";

const fadeUp = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18 } };

// ── KPI Stat Card ──
export function InvKpiCard({ title, value, icon: Icon, color, subtitle, trend, animate = true }: {
  title: string; value: string; icon: any; color: string;
  subtitle?: string; trend?: { value: number; direction: "up" | "down" | "flat" };
  animate?: boolean;
}) {
  const Component = animate ? motion.div : "div";
  return (
    <Component {...(animate ? fadeUp : {})} className="bg-white/[0.04] border border-white/[0.06] rounded-2xl p-3 sm:p-4 hover:bg-white/[0.06] transition-all group">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] sm:text-[10px] text-white/30 uppercase tracking-wider font-medium truncate">{title}</p>
          <p className="text-base sm:text-lg font-bold mt-1 text-white truncate tracking-tight">{value}</p>
          {subtitle && <p className="text-[8px] text-white/20 mt-0.5">{subtitle}</p>}
          {trend && (
            <div className={"flex items-center gap-1 mt-1 text-[9px] font-medium " + (trend.direction === "up" ? "text-emerald-400" : trend.direction === "down" ? "text-rose-400" : "text-white/30")}>
              {trend.direction === "up" ? <TrendingUp className="w-2.5 h-2.5" /> : trend.direction === "down" ? <TrendingDown className="w-2.5 h-2.5" /> : null}
              {trend.value}%
            </div>
          )}
        </div>
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ml-2 ${color}`}>
          <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
        </div>
      </div>
    </Component>
  );
}

// ── Section Header ──
export function InvSectionHeader({ title, subtitle, icon: Icon, right }: {
  title: string; subtitle?: string; icon?: any; right?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        {Icon && <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Icon className="w-4 h-4 text-amber-400" /></div>}
        <div>
          <h2 className="text-xs font-semibold text-white">{title}</h2>
          {subtitle && <p className="text-[9px] text-white/30">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ── Filter Toolbar ──
export function InvFilterBar({ children }: { children: ReactNode }) {
  return <div className="flex gap-2 items-center flex-wrap">{children}</div>;
}
export function InvSearchInput({ value, onChange, placeholder = "Search..." }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex-1 min-w-[160px] relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full h-10 pl-9 pr-3 rounded-xl bg-white/5 border border-white/[0.06] text-white text-xs placeholder-white/20 outline-none focus:border-amber-500/30 transition-colors" />
    </div>
  );
}

// ── Data Table ──
export function InvTable({ columns, data, loading, emptyText, emptyIcon: EI, emptyCTA, keyField = "id", animateRows = true }: {
  columns: { key: string; label: string; align?: "left" | "right" | "center"; hideOn?: "sm" | "md" | "lg" }[];
  data: any[]; loading?: boolean;
  emptyText?: string; emptyIcon?: any; emptyCTA?: ReactNode;
  keyField?: string; animateRows?: boolean;
}) {
  if (loading) return <InvLoadingSkeleton rows={5} cols={columns.length} />;
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/[0.04] text-[9px] text-white/30 uppercase tracking-wider">
              {columns.map((c) => (
                <th key={c.key} className={`px-4 py-3 font-medium ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${c.hideOn ? `hidden ${c.hideOn}:table-cell` : ""}`}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((row, i) => {
              const Component = animateRows ? motion.tr : "tr";
              return (
                <Component key={row[keyField] ?? i} {...(animateRows ? { ...fadeUp, transition: { ...fadeUp.transition, delay: i * 0.015 } } : {})}
                  className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                  {columns.map((c) => (
                    <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"} ${c.hideOn ? `hidden ${c.hideOn}:table-cell` : ""}`}>
                      {row[c.key]}
                    </td>
                  ))}
                </Component>
              );
            }) : (
              <tr><td colSpan={columns.length} className="text-center py-12">
                {EI && <EI className="w-8 h-8 text-white/[0.06] mx-auto mb-2" />}
                <p className="text-xs text-white/20">{emptyText || "No data"}</p>
                {emptyCTA}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Drawer / Slide Panel ──
export function InvDrawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />}
      <motion.div
        initial={{ x: "100%" }} animate={{ x: open ? 0 : "100%" }} exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-[#0d1128] border-l border-white/[0.06] shadow-2xl z-50 overflow-y-auto"
      >
        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </motion.div>
    </>
  );
}

// ── Loading Skeleton ──
export function InvLoadingSkeleton({ rows = 4, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl overflow-hidden p-4 space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="flex-1 h-4 bg-white/[0.04] rounded-lg animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Empty State ──
export function InvEmptyState({ icon: Icon, text, cta }: { icon: any; text: string; cta?: ReactNode }) {
  return (
    <div className="text-center py-12">
      <Icon className="w-10 h-10 text-white/[0.06] mx-auto mb-3" />
      <p className="text-xs text-white/20">{text}</p>
      {cta && <div className="mt-3">{cta}</div>}
    </div>
  );
}

// ── Page Shell ──
export function InvPageShell({ title, subtitle, right, children }: {
  title: string; subtitle?: string; right?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <InvSectionHeader title={title} subtitle={subtitle} right={right} />
        {children}
      </div>
    </div>
  );
}

// ── GlassCard ──
export function InvGlassCard({ children, className = "", animate = true }: { children: ReactNode; className?: string; animate?: boolean }) {
  const Comp = animate ? motion.div : "div";
  return (
    <Comp {...(animate ? fadeUp : {})} className={`bg-white/[0.04] border border-white/[0.06] rounded-2xl p-4 backdrop-blur-xl ${className}`}>
      {children}
    </Comp>
  );
}