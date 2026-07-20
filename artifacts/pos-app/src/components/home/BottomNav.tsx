import { Home, LayoutGrid, Target, Sparkles, User } from "lucide-react";

export type BottomTab = "home" | "apps" | "mission" | "ai" | "profile";

interface BottomNavProps {
  active: BottomTab;
  onChange: (tab: BottomTab) => void;
}

const tabs: { id: BottomTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "apps", label: "Apps", icon: LayoutGrid },
  { id: "mission", label: "Mission", icon: Target },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "profile", label: "Profile", icon: User },
];

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div
        className="flex items-center justify-around py-1.5 px-2 rounded-full pointer-events-auto mx-auto"
        style={{
          width: "calc(100% - 48px)",
          maxWidth: 400,
          background: "rgba(255,255,255,0.75)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow:
            "0 4px 24px rgba(0,0,0,0.06), 0 0 0 1px rgba(255,255,255,0.6), 0 0 0 1px rgba(0,0,0,0.04) inset",
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
                  className="w-12 h-12 rounded-full flex items-center justify-center active:scale-[0.96] transition-transform"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #4F46E5, #6366F1)"
                      : "linear-gradient(135deg, rgba(79,70,229,0.4), rgba(99,102,241,0.4))",
                    boxShadow: isActive
                      ? "0 4px 16px rgba(79,70,229,0.4)"
                      : "0 2px 8px rgba(79,70,229,0.15)",
                  }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span
                  className="text-[10px] font-semibold mt-0.5"
                  style={{ color: isActive ? "#4F46E5" : "#94A3B8" }}
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
              className="flex flex-col items-center gap-0.5 py-1 px-2 min-w-[56px]"
            >
              {isActive ? (
                <div
                  className="w-10 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "#4F46E5" }}
                >
                  <Icon className="w-[18px] h-[18px] text-white" />
                </div>
              ) : (
                <div className="w-10 h-8 rounded-full flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-[#94A3B8]" />
                </div>
              )}
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? "#4F46E5" : "#94A3B8" }}
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
