import { Search, Bell, MessageSquare, Crown, ChevronDown, Wifi } from "lucide-react";

interface TopNavbarProps {
  user: { name?: string; email?: string; role?: string } | null;
  onSignOut: () => void;
  onNotificationToggle: () => void;
  onCommandPalette: () => void;
}

export default function TopNavbar({ user, onSignOut, onNotificationToggle, onCommandPalette }: TopNavbarProps) {
  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <nav className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200">
          <Crown className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 leading-tight">LUME'S OS</span>
          <span className="text-[9px] text-gray-400 font-medium leading-tight">Cloud Operating System</span>
        </div>
      </div>

      {/* Search */}
      <button
        onClick={onCommandPalette}
        className="flex-1 max-w-xl mx-auto flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all cursor-pointer group"
      >
        <Search className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
        <span className="text-sm text-gray-400 group-hover:text-gray-500">Search anything in Lumé's OS...</span>
        <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-300 font-mono">
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">⌘</kbd>
          <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-[10px]">K</kbd>
        </div>
      </button>

      {/* Right section */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Runtime status */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg">
          <Wifi className="w-3 h-3 text-emerald-500" />
          <span className="text-[10px] font-semibold text-emerald-600">Healthy</span>
        </div>

        {/* Notifications */}
        <button
          onClick={onNotificationToggle}
          className="relative w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <Bell className="w-4.5 h-4.5 text-gray-500" />
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 rounded-full text-[8px] font-bold text-white flex items-center justify-center">
            3
          </span>
        </button>

        {/* Chat */}
        <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors">
          <MessageSquare className="w-4.5 h-4.5 text-gray-500" />
        </button>

        {/* User */}
        <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-gray-100 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
            {initials}
          </div>
          <div className="hidden xl:flex flex-col items-start">
            <span className="text-xs font-semibold text-gray-900 leading-tight">{user?.name || "User"}</span>
            <span className="text-[9px] text-gray-400 leading-tight capitalize">{user?.role || "Founder"}</span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden xl:block" />
        </button>
      </div>
    </nav>
  );
}
