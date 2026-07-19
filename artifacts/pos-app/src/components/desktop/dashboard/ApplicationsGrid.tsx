import {
  ShoppingBag, TrendingUp, Package, Users, ShoppingCart,
  UserCog, BarChart3, Target, BookOpen, Sparkles, Zap, Settings,
} from "lucide-react";

interface AppItem {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const APPS: AppItem[] = [
  { id: "pos", name: "POS", subtitle: "Kasir", icon: <ShoppingBag className="w-5 h-5" />, color: "#4F46E5", bg: "#EEF2FF" },
  { id: "finance", name: "Finance", subtitle: "Keuangan", icon: <TrendingUp className="w-5 h-5" />, color: "#059669", bg: "#ECFDF5" },
  { id: "inventory", name: "Inventory", subtitle: "Stok", icon: <Package className="w-5 h-5" />, color: "#D97706", bg: "#FFFBEB" },
  { id: "crm", name: "CRM", subtitle: "Pelanggan", icon: <Users className="w-5 h-5" />, color: "#7C3AED", bg: "#F5F3FF" },
  { id: "purchasing", name: "Purchasing", subtitle: "Pembelian", icon: <ShoppingCart className="w-5 h-5" />, color: "#0EA5E9", bg: "#F0F9FF" },
  { id: "hr", name: "HR", subtitle: "Karyawan", icon: <UserCog className="w-5 h-5" />, color: "#DC2626", bg: "#FEF2F2" },
  { id: "reports", name: "Reports", subtitle: "Laporan", icon: <BarChart3 className="w-5 h-5" />, color: "#8B5CF6", bg: "#F5F3FF" },
  { id: "missions", name: "Missions", subtitle: "Tugas AI", icon: <Target className="w-5 h-5" />, color: "#F59E0B", bg: "#FFFBEB" },
  { id: "knowledge", name: "Knowledge", subtitle: "Basis Ilmu", icon: <BookOpen className="w-5 h-5" />, color: "#10B981", bg: "#ECFDF5" },
  { id: "ai", name: "AI Assistant", subtitle: "Asisten", icon: <Sparkles className="w-5 h-5" />, color: "#6366F1", bg: "#EEF2FF" },
  { id: "automation", name: "Automation", subtitle: "Otomatisasi", icon: <Zap className="w-5 h-5" />, color: "#F43F5E", bg: "#FFF1F2" },
  { id: "settings", name: "Settings", subtitle: "Pengaturan", icon: <Settings className="w-5 h-5" />, color: "#64748B", bg: "#F8FAFC" },
];

interface ApplicationsGridProps {
  onAppClick?: (appId: string) => void;
}

export default function ApplicationsGrid({ onAppClick }: ApplicationsGridProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Applications</h3>
      <div className="grid grid-cols-4 gap-2">
        {APPS.map((app) => (
          <button
            key={app.id}
            onClick={() => onAppClick?.(app.id)}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl hover:bg-gray-50 transition-all active:scale-95 cursor-pointer group"
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
              style={{ background: app.bg, color: app.color }}
            >
              {app.icon}
            </div>
            <span className="text-[11px] font-medium text-gray-700 leading-tight text-center">{app.name}</span>
            <span className="text-[9px] text-gray-400 leading-tight text-center">{app.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
