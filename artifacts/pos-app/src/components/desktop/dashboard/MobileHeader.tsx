import { Menu, Bell, Crown } from "lucide-react";

interface MobileHeaderProps {
  user: { name?: string; email?: string } | null;
  onMenuToggle: () => void;
  onNotificationToggle: () => void;
}

export default function MobileHeader({ user, onMenuToggle, onNotificationToggle }: MobileHeaderProps) {
  return (
    <div className="h-14 bg-white border-b border-gray-100 flex items-center px-4 shrink-0">
      <button onClick={onMenuToggle} className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex-1 flex items-center justify-center gap-2">
        <Crown className="w-4 h-4 text-indigo-500" />
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-gray-900 leading-tight">LUMÉ'S OS</span>
          <span className="text-[8px] text-gray-400 font-medium leading-tight">Cloud Operating System</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onNotificationToggle}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
          {user?.name
            ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
            : "?"}
        </div>
      </div>
    </div>
  );
}
