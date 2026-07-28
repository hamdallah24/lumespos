import { useState, Component, type ReactNode } from "react";
import { BranchProvider, useBranch } from "@/lib/branch";
import { motion, AnimatePresence } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Truck, FileText, Package, Receipt, BarChart3,
  AlertTriangle, Menu, X, ShoppingCart, ChevronRight, Layers, Boxes, Grip,
} from "lucide-react";

import SupplierWorkspace from "@/modules/purchasing/pages/SupplierWorkspace";
import PurchaseOrderWorkspace from "@/modules/purchasing/pages/PurchaseOrderWorkspace";
import GoodsReceiptWorkspace from "@/modules/purchasing/pages/GoodsReceiptWorkspace";
import InvoiceWorkspace from "@/modules/purchasing/pages/InvoiceWorkspace";
import ProcurementAnalytics from "@/modules/purchasing/pages/ProcurementAnalytics";
import DashboardWorkspace from "@/modules/purchasing/pages/DashboardWorkspace";

type Tab = string;
interface NavGroup { label: string; icon: any; items: { id: Tab; label: string; icon: any }[]; }

const groups: NavGroup[] = [
  {
    label: "Overview", icon: LayoutDashboard, items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    ]
  },
  {
    label: "Master Data", icon: Truck, items: [
      { id: "suppliers", label: "Supplier", icon: Truck },
    ]
  },
  {
    label: "Operasional", icon: ShoppingCart, items: [
      { id: "purchase-orders", label: "Purchase Order", icon: FileText },
      { id: "goods-receipts", label: "Goods Receipt", icon: Package },
      { id: "invoices", label: "Supplier Invoice", icon: Receipt },
    ]
  },
  {
    label: "Monitoring", icon: BarChart3, items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
    ]
  },
];

const allItems = groups.flatMap(g => g.items);

const mobileIcons: Record<string, any> = {
  Overview: LayoutDashboard, "Master Data": Truck, Operasional: Grip, Monitoring: Layers,
};

class PageBoundary extends Component<{ children: ReactNode; page: string }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-400" />
          <p className="text-sm font-medium text-white/70">Gagal memuat {this.props.page}</p>
          <p className="text-xs text-white/40 max-w-xs">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })}
            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-white/60">
            Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Sidebar({ tab, onSelect }: { tab: Tab; onSelect: (t: Tab) => void }) {
  const { branches, branchId, setBranchId } = useBranch();
  return (
    <div className="w-52 lg:w-56 shrink-0 bg-[#070B18] border-r border-white/[0.05] flex flex-col h-full">
      <div className="p-3 border-b border-white/[0.04]">
        <p className="text-[10px] text-white/20 uppercase tracking-wider font-semibold px-1 mb-2">Branch</p>
        <Select value={branchId != null ? String(branchId) : undefined} onValueChange={(v) => setBranchId(Number(v))}>
          <SelectTrigger className="h-8 text-[10px] rounded-xl bg-white/[0.04] border-white/[0.06] text-white/70">
            <div className="flex items-center gap-1.5 min-w-0">
              <Truck className="w-3 h-3 shrink-0 opacity-50" />
              <SelectValue placeholder="Pilih cabang" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {groups.map((group) => {
          const GroupIcon = group.icon;
          const hasActive = group.items.some(i => i.id === tab);
          return (
            <div key={group.label}>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <GroupIcon className={`w-3 h-3 ${hasActive ? "text-orange-400" : "text-white/20"}`} />
                <span className="text-[9px] font-semibold uppercase tracking-wider text-white/20">{group.label}</span>
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = tab === item.id;
                return (
                  <button key={item.id} onClick={() => onSelect(item.id)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all text-left w-full ml-2 text-xs ${active ? "bg-orange-500/10 text-orange-400 font-semibold" : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"}`}>
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
        <p className="text-[9px] text-white/15 text-center">Purchasing Engine v1.0</p>
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
            <ShoppingCart className="w-4 h-4 text-orange-400" /> Purchasing
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
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all text-left w-full ml-2 text-xs ${active ? "bg-orange-500/10 text-orange-400 font-semibold" : "text-white/50 hover:text-white/70 hover:bg-white/[0.03]"}`}>
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

function MobileBottomNav({ tab, onDrawerOpen, onGroupSelect }: { tab: Tab; onDrawerOpen: () => void; onGroupSelect: (g: NavGroup) => void }) {
  const currentGroup = groups.find(g => g.items.some(i => i.id === tab)) || groups[0];
  return (
    <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30 flex items-center justify-center">
      <div className="bg-[#0d1128]/95 backdrop-blur-xl border border-white/[0.08] rounded-full flex items-center gap-0.5 p-1 shadow-xl shadow-black/30">
        <button onClick={onDrawerOpen}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/50 hover:text-white/70 transition-colors">
          <Menu className="w-4 h-4" />
        </button>
        {groups.map((g) => {
          const Icon = mobileIcons[g.label] || Layers;
          const active = g.items.some(i => i.id === tab);
          return (
            <button key={g.label} onClick={() => onGroupSelect(g)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${active ? "bg-orange-500/20 text-orange-400" : "text-white/30 hover:text-white/50"}`}>
              <Icon className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MobileGroupSheet({ group, open, onClose, onSelect, tab }: { group: NavGroup | null; open: boolean; onClose: () => void; onSelect: (t: Tab) => void; tab: Tab }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <motion.div
        initial={{ y: "100%" }} animate={{ y: open ? 0 : "100%" }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d1128] border-t border-white/[0.06] rounded-t-2xl max-h-[60vh] overflow-y-auto lg:hidden"
      >
        <div className="flex items-center justify-center pt-2 pb-1">
          <div className="w-8 h-1 rounded-full bg-white/[0.1]" />
        </div>
        <div className="p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            {group && <group.icon className="w-4 h-4 text-orange-400" />}
            {group?.label}
          </h3>
          <div className="space-y-1">
            {group?.items.map(item => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button key={item.id} onClick={() => { onSelect(item.id); onClose(); }}
                  className={`flex items-center gap-2.5 w-full px-3 py-3 rounded-xl text-left text-xs transition-all ${active ? "bg-orange-500/10 text-orange-400 font-semibold" : "text-white/60 hover:bg-white/[0.04]"}`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}

function WorkspaceContent({ tab }: { tab: Tab }) {
  const page = allItems.find(i => i.id === tab)?.label || tab;
  return (
    <PageBoundary page={page}>
      {tab === "dashboard" && <DashboardWorkspace />}
      {tab === "suppliers" && <SupplierWorkspace />}
      {tab === "purchase-orders" && <PurchaseOrderWorkspace />}
      {tab === "goods-receipts" && <GoodsReceiptWorkspace />}
      {tab === "invoices" && <InvoiceWorkspace />}
      {tab === "analytics" && <ProcurementAnalytics />}
    </PageBoundary>
  );
}

export default function PurchasingApp() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState<NavGroup | null>(null);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);

  const handleGroupSelect = (g: NavGroup) => {
    setActiveGroup(g);
    setGroupSheetOpen(true);
  };

  return (
    <BranchProvider>
      <div className="h-full w-full bg-[#0a0e1a] flex flex-col lg:flex-row overflow-hidden">
        <div className="hidden lg:flex h-full">
          <Sidebar tab={tab} onSelect={setTab} />
        </div>

        <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-white/[0.04] shrink-0">
          <button onClick={() => setDrawerOpen(true)}
            className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center text-white/50">
            <Menu className="w-4 h-4" />
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold text-white">{allItems.find(i => i.id === tab)?.label || "Purchasing"}</p>
            <p className="text-[9px] text-white/20">{groups.find(g => g.items.some(i => i.id === tab))?.label}</p>
          </div>
          <div className="w-9 h-9" />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden pb-14 lg:pb-0">
          <WorkspaceContent tab={tab} />
        </div>

        <MobileBottomNav tab={tab} onDrawerOpen={() => setDrawerOpen(true)} onGroupSelect={handleGroupSelect} />

        <AnimatePresence>
          {drawerOpen && <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} tab={tab} onSelect={setTab} />}
        </AnimatePresence>

        <AnimatePresence>
          {groupSheetOpen && activeGroup && (
            <MobileGroupSheet group={activeGroup} open={groupSheetOpen} onClose={() => setGroupSheetOpen(false)} onSelect={setTab} tab={tab} />
          )}
        </AnimatePresence>
      </div>
    </BranchProvider>
  );
}
