import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TreePine, Users, Building2, Briefcase, Search, ChevronRight, ChevronDown,
  AlertTriangle, Info, Sparkles, TrendingUp, BarChart3, Target, Layers,
  User, ArrowUp, Clock, XCircle, CheckCircle,
} from "lucide-react";
import {
  useOrgChart, useOrgAnalytics, useOrgSuggestions, useOrgManagerChain,
} from "../hooks/useHr";
import type { OrgChartData, OrgAnalytics, OrgSuggestion } from "../types";

const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string; bar: string }> = {
  executive: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20", bar: "from-amber-500 to-orange-400" },
  director: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20", bar: "from-purple-500 to-violet-400" },
  manager: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20", bar: "from-blue-500 to-cyan-400" },
  supervisor: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20", bar: "from-emerald-500 to-teal-400" },
  staff: { bg: "bg-slate-500/10", text: "text-slate-400", border: "border-slate-500/20", bar: "from-slate-500 to-slate-400" },
  operator: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/20", bar: "from-cyan-500 to-sky-400" },
  intern: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/20", bar: "from-pink-500 to-rose-400" },
};

const severityConfig = {
  critical: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
};

function OrgChartNode({
  node, depth, selectedId, onSelect,
}: {
  node: OrgChartData; depth: number; selectedId: number | null; onSelect: (n: OrgChartData) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children.length > 0;
  const lc = LEVEL_COLORS[node.level || "staff"] || LEVEL_COLORS.staff;
  const isSelected = selectedId === node.id;

  return (
    <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all cursor-pointer group
          ${isSelected ? "bg-red-500/10 border border-red-500/20" : "hover:bg-white/[0.02] border border-transparent"}`}
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => onSelect(node)}>
        <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={`w-5 h-5 rounded flex items-center justify-center text-white/20 hover:text-white/50 shrink-0
            ${hasChildren ? "" : "invisible"}`}>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <div className={`w-8 h-8 rounded-lg ${lc.bg} border ${lc.border} flex items-center justify-center shrink-0`}>
          <User className={`w-4 h-4 ${lc.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/80 font-semibold truncate">{node.name}</span>
            {node.level && (
              <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase border ${lc.bg} ${lc.text} ${lc.border}`}>
                {node.level}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            {node.departmentName && <span className="text-[9px] text-white/20">{node.departmentName}</span>}
            {node.grade && <span className="text-[9px] text-white/15 font-mono">Grade {node.grade}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 text-[9px] text-white/20">
            <Users className="w-2.5 h-2.5" />{node.employeeCount}
          </div>
          {node.vacantPositions > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[8px] font-medium">
              {node.vacantPositions} vacant
            </span>
          )}
        </div>
      </div>
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            {node.children.map(child => (
              <OrgChartNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailPanel({ node, onClose }: { node: OrgChartData; onClose: () => void }) {
  const lc = LEVEL_COLORS[node.level || "staff"] || LEVEL_COLORS.staff;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">{node.name}</h3>
          <p className="text-[10px] text-white/30 mt-0.5">{node.departmentName || "No department"}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/5">
          <XCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {node.level && (
          <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold uppercase border ${lc.bg} ${lc.text} ${lc.border}`}>
            {node.level}
          </span>
        )}
        {node.grade && (
          <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-white/5 text-white/40 border border-white/10">
            Grade {node.grade}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-[8px] text-white/20 uppercase">Direct Reports</p>
          <p className="text-lg font-bold text-white/70">{node.children.length}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-[8px] text-white/20 uppercase">Team Size</p>
          <p className="text-lg font-bold text-blue-400">{node.employeeCount}</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-[8px] text-white/20 uppercase">Avg Tenure</p>
          <p className="text-lg font-bold text-emerald-400">{node.avgTenureMonths}mo</p>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-2.5">
          <p className="text-[8px] text-white/20 uppercase">Vacant</p>
          <p className={`text-lg font-bold ${node.vacantPositions > 0 ? "text-amber-400" : "text-white/20"}`}>
            {node.vacantPositions}
          </p>
        </div>
      </div>

      {node.competencyTags && (
        <div>
          <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Competencies</p>
          <div className="flex flex-wrap gap-1">
            {node.competencyTags.split(",").map((tag, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 text-white/40 text-[9px]">
                {tag.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {node.children.length > 0 && (
        <div>
          <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1.5">Reports</p>
          <div className="space-y-1">
            {node.children.map(c => {
              const clc = LEVEL_COLORS[c.level || "staff"] || LEVEL_COLORS.staff;
              return (
                <div key={c.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]">
                  <div className={`w-5 h-5 rounded ${clc.bg} flex items-center justify-center`}>
                    <User className={`w-2.5 h-2.5 ${clc.text}`} />
                  </div>
                  <span className="text-[10px] text-white/60 flex-1">{c.name}</span>
                  <span className="text-[9px] text-white/20">{c.employeeCount} staff</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function AnalyticsSidebar({ analytics }: { analytics?: OrgAnalytics }) {
  if (!analytics) return null;

  const maxDeptEmps = Math.max(...analytics.departments.map(d => d.employeeCount), 1);

  return (
    <div className="space-y-3">
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
          <BarChart3 className="w-3 h-3 text-red-400" /> Department Heat Map
        </p>
        <div className="space-y-1.5">
          {analytics.departments.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="text-[9px] text-white/30 w-20 truncate">{d.name}</span>
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-400 transition-all"
                  style={{ width: `${(d.employeeCount / maxDeptEmps) * 100}%` }} />
              </div>
              <span className="text-[9px] text-white/20 w-6 text-right">{d.employeeCount}</span>
            </div>
          ))}
          {analytics.departments.length === 0 && (
            <p className="text-[10px] text-white/15 text-center py-2">No departments</p>
          )}
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2">Vacancy Map</p>
        <div className="space-y-1">
          {analytics.departments.filter(d => d.vacantCount > 0).map(d => (
            <div key={d.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <span className="text-[10px] text-white/60">{d.name}</span>
              <span className="text-[9px] text-amber-400 font-medium">{d.vacantCount} vacant</span>
            </div>
          ))}
          {analytics.departments.filter(d => d.vacantCount > 0).length === 0 && (
            <p className="text-[10px] text-white/15 text-center py-2">No vacancies</p>
          )}
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
        <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2">Level Distribution</p>
        <div className="space-y-1.5">
          {analytics.levelDistribution.map(l => {
            const lc = LEVEL_COLORS[l.level] || LEVEL_COLORS.staff;
            const maxLvl = Math.max(...analytics.levelDistribution.map(x => x.count), 1);
            return (
              <div key={l.level} className="flex items-center gap-2">
                <span className={`text-[9px] w-16 truncate capitalize ${lc.text}`}>{l.level}</span>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full bg-gradient-to-r ${lc.bar} transition-all`}
                    style={{ width: `${(l.count / maxLvl) * 100}%` }} />
                </div>
                <span className="text-[9px] text-white/20 w-4 text-right">{l.count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AISuggestions({ suggestions }: { suggestions: OrgSuggestion[] }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
      <p className="text-[9px] text-white/30 uppercase tracking-wider font-medium mb-2 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-amber-400" /> AI Organization Officer
      </p>
      <div className="space-y-1.5">
        {suggestions.map((s, i) => {
          const cfg = severityConfig[s.severity] || severityConfig.info;
          const Icon = cfg.icon;
          return (
            <div key={i} className={`flex items-start gap-2 px-2.5 py-2 rounded-lg border ${cfg.bg}`}>
              <Icon className={`w-3 h-3 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-medium ${cfg.color}`}>{s.title}</p>
                <p className="text-[9px] text-white/30 mt-0.5">{s.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function OrgWorkspace() {
  const { data: chart, isLoading: chartLoading } = useOrgChart();
  const { data: analytics } = useOrgAnalytics();
  const { data: suggestions } = useOrgSuggestions();
  const [selected, setSelected] = useState<OrgChartData | null>(null);
  const [zoom, setZoom] = useState(100);

  const renderTree = (nodes: OrgChartData[], depth = 0) =>
    nodes.map(n => (
      <OrgChartNode key={n.id} node={n} depth={depth} selectedId={selected?.id} onSelect={setSelected} />
    ));

  return (
    <div className="h-full w-full bg-[#0a0e1a] overflow-y-auto" style={{ WebkitOverflowScrolling: "touch" }}>
      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
            <TreePine className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">Organization</h1>
            <p className="text-[10px] text-white/30">Interactive org chart & analytics</p>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { label: "Departments", value: analytics?.totalDepartments ?? 0, icon: Building2, color: "text-white/60" },
            { label: "Positions", value: analytics?.totalPositions ?? 0, icon: Briefcase, color: "text-red-400" },
            { label: "Employees", value: analytics?.totalEmployees ?? 0, icon: Users, color: "text-blue-400" },
            { label: "Vacant", value: analytics?.vacantPositions ?? 0, icon: Target, color: "text-amber-400" },
            { label: "Avg Span", value: analytics?.avgSpanOfControl ?? 0, icon: TrendingUp, color: "text-emerald-400" },
            { label: "Depth", value: analytics?.hierarchyDepth ?? 0, icon: Layers, color: "text-purple-400" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl p-3">
              <p className="text-[8px] text-white/30 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {suggestions && suggestions.length > 0 && <AISuggestions suggestions={suggestions} />}

        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {/* Zoom Controls */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1">
                <button onClick={() => setZoom(z => Math.max(50, z - 10))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.05] text-xs min-h-10">-</button>
                <span className="text-[10px] text-white/30 w-10 text-center">{zoom}%</span>
                <button onClick={() => setZoom(z => Math.min(150, z + 10))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.05] text-xs min-h-10">+</button>
                <button onClick={() => setZoom(100)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.05] text-[9px] min-h-10">1:1</button>
              </div>
              <div className="flex items-center gap-2 text-[9px] text-white/20">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-400/40" />Executive</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-purple-400/40" />Director</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-400/40" />Manager</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-400/40" />Supervisor</span>
              </div>
            </div>

            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl overflow-hidden py-1">
              <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}>
                {chartLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-white/20 mt-3">Loading organization chart...</p>
                </div>
              ) : chart && chart.length > 0 ? renderTree(chart) : (
                <div className="py-12 text-center">
                  <TreePine className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-xs text-white/20">No organization structure yet</p>
                  <p className="text-[10px] text-white/15 mt-1">Create positions with hierarchy to build your org chart</p>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Desktop: sidebar. Mobile: selected node shows as bottom sheet */}
          <div className="w-80 shrink-0 hidden lg:block space-y-4">
            <AnimatePresence mode="wait">
              {selected ? (
                <DetailPanel key={selected.id} node={selected} onClose={() => setSelected(null)} />
              ) : (
                <AnalyticsSidebar key="analytics" analytics={analytics} />
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile detail panel — bottom sheet */}
        {selected && (
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[#0d1128] border-t border-white/10 rounded-t-2xl max-h-[60vh] overflow-y-auto p-4 shadow-2xl">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
            <DetailPanel node={selected} onClose={() => setSelected(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
