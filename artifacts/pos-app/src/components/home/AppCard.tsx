import {
  ShoppingBag,
  TrendingUp,
  Package,
  Users,
  UserCog,
  Sparkles,
  Store,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingBag,
  TrendingUp,
  Package,
  Users,
  UserCog,
  Sparkles,
  Store,
  Settings,
};

const descriptions: Record<string, string> = {
  pos: "Point of sale & checkout",
  finance: "Revenue, cashflow & reports",
  inventory: "Stock management & alerts",
  crm: "Customers & relationships",
  hr: "Staff, payroll & shifts",
  "ai-chat": "AI Executive Intelligence",
  marketplace: "Vendors & procurement",
  settings: "System configuration",
};

interface AppCardProps {
  id: string;
  title: string;
  icon: string;
  color: string;
  onClick: () => void;
}

export default function AppCard({ id, title, icon, color, onClick }: AppCardProps) {
  const Icon = iconMap[icon] || Package;
  const desc = descriptions[id] || "";

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 p-4 rounded-[22px] bg-white active:scale-[0.98] transition-transform text-left"
      style={{
        height: 110,
        boxShadow: "0 1px 3px rgba(0,0,0,0.03), 0 0 0 0.5px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
        style={{
          background: `${color}10`,
          boxShadow: `0 0 0 0.5px ${color}18`,
        }}
      >
        <span style={{ color }}>
          <Icon className="w-6 h-6" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-[#111827] leading-tight">
          {title}
        </p>
        <p className="text-[12px] text-[#6B7280] mt-0.5 leading-tight line-clamp-1">
          {desc}
        </p>
      </div>
    </button>
  );
}
