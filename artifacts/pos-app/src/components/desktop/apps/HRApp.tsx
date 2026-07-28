import { useState } from "react";
import { BranchProvider, useBranch } from "@/lib/branch";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, Clock, CalendarOff, TreePine, ShieldCheck,
  Menu, X, UserCog, Sparkles, ClipboardList, Building2, Briefcase, BarChart3,
} from "lucide-react";
import HRWorkspace from "@/modules/hr/pages/HRWorkspace";
import EmployeeWorkspace from "@/modules/hr/pages/EmployeeWorkspace";
import AttendanceWorkspace from "@/modules/hr/pages/AttendanceWorkspace";
import LeaveWorkspace from "@/modules/hr/pages/LeaveWorkspace";
import DepartmentWorkspace from "@/modules/hr/pages/DepartmentWorkspace";
import PositionWorkspace from "@/modules/hr/pages/PositionWorkspace";
import OrgWorkspace from "@/modules/hr/pages/OrgWorkspace";
import CompanyInitWizard from "@/modules/hr/pages/CompanyInitWizard";
import RecruitmentWorkspace from "@/modules/hr/pages/RecruitmentWorkspace";
import WorkforceAnalyticsPage from "@/modules/hr/pages/WorkforceAnalyticsPage";

type Tab = string;
interface NavGroup { label: string; icon: any; items: { id: Tab; label: string; icon: any }[]; }

const groups: NavGroup[] = [
  {
    label: "Company Setup", icon: Sparkles, items: [
      { id: "wizard", label: "Setup Wizard", icon: Sparkles },
    ]
  },
  {
    label: "Overview", icon: LayoutDashboard, items: [
      { id: "workspace", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "Master Data", icon: Building2, items: [
      { id: "departments", label: "Departemen", icon: Building2 },
      { id: "positions", label: "Posisi", icon: Briefcase },
    ]
  },
  {
    label: "Karyawan", icon: Users, items: [
      { id: "employees", label: "Explorer", icon: Users },
      { id: "org", label: "Organisasi", icon: TreePine },
    ]
  },
  {
    label: "Operasional", icon: Clock, items: [
      { id: "attendance", label: "Absensi", icon: Clock },
      { id: "leaves", label: "Cuti", icon: CalendarOff },
    ]
  },
  {
    label: "Rekrutmen", icon: ClipboardList, items: [
      { id: "recruitment", label: "Rekrutmen", icon: ClipboardList },
      { id: "analytics", label: "Analytics", icon: BarChart3 },
    ]
  },
];

const allItems = groups.flatMap(g => g.items);

function PageBoundary({ page, children }: { page: string; children: React.ReactNode }) {
  return (
    <div className="h-full w-full overflow-y-auto" key={page}>
      {children}
    </div>
  );
}

function Sidebar({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab) => void }) {
  return (
    <div className="w-56 bg-[#0d1128] border-r border-white/[0.06] flex flex-col shrink-0">
      <div className="p-4 border-b border-white/[0.04]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <UserCog className="w-4 h-4 text-red-400" /> HR
        </h3>
      </div>
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {groups.map((group) => {
          const GroupIcon = group.icon;
          const hasActive = group.items.some(i => i.id === tab);
          return (
            <div key={group.label}>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <GroupIcon className={`w-3 h-3 ${hasActive ? "text-red-400" : "text-white/20"}`} />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/20">{group.label}</span>
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button key={item.id} onClick={() => onSelect(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left w-full ml-2 text-xs ${active ? "bg-red-500/10 text-red-400 font-semibold" : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="p-3 border-t border-white/[0.04]">
        <p className="text-[9px] text-white/15 text-center">HR Engine v1.0</p>
      </div>
    </div>
  );
}

function MobileDrawer({ open, onClose, tab, onSelect }: { open: boolean; onClose: () => void; tab: Tab; onSelect: (t: Tab) => void }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <motion.div
        initial={{ x: "-100%" }} animate={{ x: open ? 0 : "-100%" }} exit={{ x: "-100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed left-0 top-0 h-full w-72 bg-[#0d1128] border-r border-white/[0.06] shadow-2xl z-50 overflow-y-auto lg:hidden"
      >
        <div className="p-4 border-b border-white/[0.04] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <UserCog className="w-4 h-4 text-red-400" /> HR
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="py-2 px-2 space-y-1">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/20">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button key={item.id} onClick={() => { onSelect(item.id); onClose(); }}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left w-full ml-2 text-xs ${active ? "bg-red-500/10 text-red-400 font-semibold" : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"}`}>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </motion.div>
    </>
  );
}

function MobileBottomNav({ tab, onDrawerOpen }: { tab: Tab; onDrawerOpen: () => void }) {
  return (
    <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 flex items-center justify-center">
      <div className="bg-[#0d1128]/95 backdrop-blur-xl border border-white/[0.08] rounded-full flex items-center gap-0.5 p-1 shadow-xl shadow-black/30">
        <button onClick={onDrawerOpen}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/40 hover:text-white/70 hover:bg-white/[0.06]">
          <Menu className="w-4 h-4" />
        </button>
        {allItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button key={item.id}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-medium transition-colors ${active ? "bg-red-500/15 text-red-400" : "text-white/30"}`}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WorkspaceContent({ tab }: { tab: Tab }) {
  return (
    <PageBoundary page={tab}>
      {tab === "wizard" && <CompanyInitWizard />}
      {tab === "workspace" && <HRWorkspace />}
      {tab === "departments" && <DepartmentWorkspace />}
      {tab === "positions" && <PositionWorkspace />}
      {tab === "employees" && <EmployeeWorkspace />}
      {tab === "org" && <OrgWorkspace />}
      {tab === "attendance" && <AttendanceWorkspace />}
      {tab === "leaves" && <LeaveWorkspace />}
      {tab === "recruitment" && <RecruitmentWorkspace />}
      {tab === "analytics" && <WorkforceAnalyticsPage />}
    </PageBoundary>
  );
}

export default function HRApp() {
  const [tab, setTab] = useState<Tab>("workspace");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <BranchProvider>
      <div className="h-full w-full bg-[#0a0e1a] flex flex-col lg:flex-row overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex h-full">
          <Sidebar tab={tab} onSelect={setTab} />
        </div>

        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-white/[0.04] shrink-0">
          <button onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/50">
            <Menu className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold text-white">{allItems.find(i => i.id === tab)?.label || "HR"}</p>
            <p className="text-[9px] text-white/20">{groups.find(g => g.items.some(i => i.id === tab))?.label}</p>
          </div>
          <div className="w-9 h-9" />
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-hidden pb-14 lg:pb-0">
          <WorkspaceContent tab={tab} />
        </div>

        {/* Mobile Bottom Nav */}
        <MobileBottomNav tab={tab} onDrawerOpen={() => setDrawerOpen(true)} />

        {/* Mobile Drawer */}
        <AnimatePresence>
          {drawerOpen && <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} tab={tab} onSelect={setTab} />}
        </AnimatePresence>
      </div>
    </BranchProvider>
  );
}
