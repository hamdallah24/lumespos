import { Home, LayoutGrid, Target, Bot, User, Plus } from "lucide-react";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "home", label: "Home", icon: Home },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "missions", label: "Missions", icon: Target },
  { id: "ai", label: "AI", icon: Bot },
  { id: "profile", label: "Profile", icon: User },
];

export default function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden">
      <div className="mx-3 mb-3 bg-white/90 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-lg shadow-gray-200/50 flex items-center justify-around px-2 py-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCenter = tab.id === "ai";

          if (isCenter) {
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="relative -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-300/50 active:scale-95 transition-transform">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              {isActive && (
                <div className="absolute -top-px inset-x-4 h-0.5 bg-indigo-600 rounded-full" />
              )}
              <tab.icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[9px] font-semibold">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
