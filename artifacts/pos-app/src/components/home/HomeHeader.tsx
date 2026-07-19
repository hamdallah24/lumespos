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
    <div
      className="flex items-center justify-between px-5 py-3"
      style={{ background: "#F6F8FC" }}
    >
      <button
        onClick={onMenuClick}
        className="w-10 h-10 rounded-xl flex items-center justify-center bg-white active:bg-gray-100 transition-colors"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        <Menu className="w-5 h-5 text-[#111827]" />
      </button>

      <div className="text-center">
        <p className="text-[15px] font-bold text-[#111827] tracking-wide">
          LUMÉ'S OS
        </p>
        <p className="text-[10px] text-[#6B7280] -mt-0.5">
          Cloud Operating System
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNotificationClick}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center bg-white active:bg-gray-100 transition-colors"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
        >
          <Bell className="w-5 h-5 text-[#111827]" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#EF4444] flex items-center justify-center">
              <span className="text-[8px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            </span>
          )}
        </button>

        <button
          onClick={onAvatarClick}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#2563EB] text-white text-[14px] font-bold"
          style={{ boxShadow: "0 1px 3px rgba(37,99,235,0.3)" }}
        >
          {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
        </button>
      </div>
    </div>
  );
}
