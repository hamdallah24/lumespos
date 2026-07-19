import {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  UserCog,
  MessageSquare,
  Store,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  ShoppingCart,
  DollarSign,
  Package,
  Users,
  UserCog,
  MessageSquare,
  Store,
  Settings,
};

interface AppCardProps {
  id: string;
  title: string;
  icon: string;
  color: string;
  onClick: () => void;
}

export default function AppCard({ title, icon, color, onClick }: AppCardProps) {
  const Icon = iconMap[icon] || Package;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white active:scale-95 transition-transform"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div
        className="w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
        style={{ background: `${color}12` }}
      >
        <span style={{ color }}>
          <Icon className="w-6 h-6" />
        </span>
      </div>
      <span className="text-[12px] font-medium text-[#111827]">{title}</span>
    </button>
  );
}
