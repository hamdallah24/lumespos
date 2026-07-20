import { Menu, Bell } from "lucide-react";
import { useNotificationStore } from "@/lib/desktop/notification-store";

interface HomeHeaderProps {
  user: { name?: string; email?: string } | null;
  onMenuClick: () => void;
  onNotificationClick: () => void;
  onAvatarClick: () => void;
}

export default function HomeHeader({
  user,
  onMenuClick,
  onNotificationClick,
  onAvatarClick,
}: HomeHeaderProps) {
  const { state: notifState } = useNotificationStore();
  const unread = notifState.unreadCount;

  return (
    <div className="flex items-center justify-between px-6" style={{ height: 72 }}>
      <button
        onClick={onMenuClick}
        className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/80 backdrop-blur-sm active:scale-[0.98] transition-transform shadow-sm border border-white/60"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        <Menu className="w-5 h-5 text-[#111827]" />
      </button>

      <div className="text-center">
        <p className="text-[18px] font-bold text-[#111827] tracking-tight leading-tight">
          LUMÉ'S OS
        </p>
        <p className="text-[11px] text-[#6B7280] -mt-0.5 tracking-wide">
          Cloud Operating System
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onNotificationClick}
          className="relative w-12 h-12 rounded-xl flex items-center justify-center bg-white/80 backdrop-blur-sm active:scale-[0.98] transition-transform shadow-sm border border-white/60"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
        >
          <Bell className="w-5 h-5 text-[#111827]" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-[#EF4444] flex items-center justify-center shadow-sm">
              <span className="text-[9px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            </span>
          )}
        </button>

        <button
          onClick={onAvatarClick}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-[#2563EB] text-white text-[16px] font-bold active:scale-[0.98] transition-transform"
          style={{ boxShadow: "0 2px 8px rgba(37,99,235,0.25)" }}
        >
          {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
        </button>
      </div>
    </div>
  );
}
