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
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center pointer-events-none">
      <div
        className="flex items-center justify-around px-3 rounded-full pointer-events-auto mx-auto"
        style={{
          width: "90%",
          maxWidth: 420,
          height: 76,
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.5)",
          boxShadow: "0 18px 50px rgba(15,23,42,0.12)",
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
                className="flex flex-col items-center -mt-6"
              >
                <div
                  className="w-[52px] h-[52px] rounded-full flex items-center justify-center active:scale-[0.96] transition-transform duration-180"
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, #4F46E5, #6366F1)"
                      : "linear-gradient(135deg, rgba(79,70,229,0.35), rgba(99,102,241,0.35))",
                    boxShadow: isActive
                      ? "0 6px 20px rgba(79,70,229,0.45)"
                      : "0 3px 10px rgba(79,70,229,0.12)",
                  }}
                >
                  <Icon className="w-[22px] h-[22px] text-white" />
                </div>
                <span
                  className="text-[10px] font-semibold mt-1"
                  style={{ color: isActive ? "#4F46E5" : "#9CA3AF" }}
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
              className="flex flex-col items-center gap-0.5 min-w-[48px] active:scale-[0.96] transition-transform duration-180"
            >
              {isActive ? (
                <div
                  className="w-11 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #4F46E5, #6366F1)",
                  }}
                >
                  <Icon className="w-[18px] h-[18px] text-white" />
                </div>
              ) : (
                <div className="w-11 h-9 rounded-full flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-[#9CA3AF]" />
                </div>
              )}
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? "#4F46E5" : "#9CA3AF" }}
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
