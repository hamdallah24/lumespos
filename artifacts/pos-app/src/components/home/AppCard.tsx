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

function softGradient(color: string): string {
  return `radial-gradient(circle at 30% 30%, ${color}18, ${color}06)`;
}

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
      className="flex items-center gap-4 p-5 rounded-[24px] bg-white active:scale-[0.985] md:hover:-translate-y-0.5 md:hover:shadow-lg transition-all duration-180 text-left"
      style={{
        height: 118,
        boxShadow: "0 8px 30px rgba(15,23,42,0.06)",
      }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
        style={{ background: softGradient(color) }}
      >
        <span style={{ color }}>
          <Icon className="w-7 h-7" />
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-bold text-[#111827] leading-tight">{title}</p>
        <p className="text-[12px] text-[#6B7280] mt-1 leading-tight line-clamp-1">{desc}</p>
      </div>
    </button>
  );
}
