import { Home, LayoutGrid, Target, Sparkles, User } from "lucide-react";

export type BottomTab = "home" | "apps" | "mission" | "ai" | "profile";

interface BottomNavProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
}

const tabs: { id: BottomTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "mission", label: "Misi", icon: Target },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "profile", label: "Profil", icon: User },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-2 pt-1.5"
      style={{ background: "#F6F8FC" }}
    >
      <div
        className="flex items-center justify-around py-2 rounded-2xl"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 -2px 12px rgba(0,0,0,0.04)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          const isAI = tab.id === "ai";
          const Icon = tab.icon;

          if (isAI) {
            return (
              <button
                key={tab.id}
                onClick={() => onChange(tab.id)}
                className="flex flex-col items-center -mt-5"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #2563EB, #3B82F6)"
                      : "linear-gradient(135deg, #2563EB80, #3B82F680)",
                    boxShadow: isActive
                      ? "0 4px 12px rgba(37,99,235,0.4)"
                      : "0 2px 8px rgba(37,99,235,0.2)",
                  }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span
                  className="text-[10px] font-medium mt-1"
                  style={{ color: isActive ? "#2563EB" : "#6B7280" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="flex flex-col items-center gap-0.5 py-1 px-3"
            >
              <div
                className="px-4 py-1 rounded-full"
                style={{
                  background: isActive ? "#2563EB15" : "transparent",
                }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: isActive ? "#2563EB" : "#6B7280" }}
                />
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ color: isActive ? "#2563EB" : "#6B7280" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
