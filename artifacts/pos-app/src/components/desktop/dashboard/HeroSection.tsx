import { Activity, Users, Target, AlertTriangle } from "lucide-react";

interface HeroSectionProps {
  userName?: string;
}

const SUMMARY_CARDS = [
  { label: "Business Health", value: "92%", icon: <Activity className="w-4 h-4" />, color: "#10B981", bg: "#ECFDF5" },
  { label: "Executives Online", value: "6/7", icon: <Users className="w-4 h-4" />, color: "#4F46E5", bg: "#EEF2FF" },
  { label: "Missions Running", value: "11", icon: <Target className="w-4 h-4" />, color: "#F59E0B", bg: "#FFFBEB" },
  { label: "Alerts", value: "2", icon: <AlertTriangle className="w-4 h-4" />, color: "#EF4444", bg: "#FEF2F2" },
];

export default function HeroSection({ userName }: HeroSectionProps) {
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  return (
    <div className="flex gap-6 items-stretch">
      {/* Left: greeting + summary */}
      <div className="flex-1 flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {userName || "User"} 👋
          </h1>
          <p className="text-sm text-gray-400 mt-1">Business is running great today.</p>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {SUMMARY_CARDS.map((card) => (
            <div key={card.label} className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: card.bg, color: card.color }}>
                {card.icon}
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium">{card.label}</p>
                <p className="text-lg font-bold text-gray-900 leading-tight">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Digital Twin placeholder */}
      <div className="w-80 shrink-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-400 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 right-4 w-16 h-16 border-2 border-white/40 rounded-lg rotate-12" />
          <div className="absolute bottom-8 left-6 w-12 h-12 border-2 border-white/30 rounded-lg -rotate-6" />
          <div className="absolute top-12 left-12 w-8 h-8 bg-white/20 rounded-lg rotate-45" />
          <div className="absolute bottom-4 right-8 w-10 h-10 bg-white/15 rounded-lg" />
          <div className="absolute top-1/2 left-1/3 w-20 h-6 bg-white/10 rounded-full blur-sm" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 backdrop-blur-sm rounded-lg">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-semibold text-white">Digital Twin • Live</span>
          </div>
        </div>

        <div className="relative z-10">
          <h3 className="text-lg font-bold text-white">Digital Twin</h3>
          <p className="text-xs text-white/70 mt-1">Your business operations visualized in real-time</p>
        </div>
      </div>
    </div>
  );
}
