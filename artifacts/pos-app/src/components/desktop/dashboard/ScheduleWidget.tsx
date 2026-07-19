import { Clock, Coffee, Users, BarChart3 } from "lucide-react";

interface Schedule {
  id: string;
  time: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}

const MOCK_SCHEDULE: Schedule[] = [
  { id: "1", time: "09:00", title: "Morning Briefing", subtitle: "Tim Operasional", icon: <Coffee className="w-3.5 h-3.5" />, color: "#4F46E5", bg: "#EEF2FF" },
  { id: "2", time: "11:30", title: "Review Stok", subtitle: "Warehouse", icon: <BarChart3 className="w-3.5 h-3.5" />, color: "#D97706", bg: "#FFFBEB" },
  { id: "3", time: "14:00", title: "Meeting Supplier", subtitle: "PT Kopi Nusantara", icon: <Users className="w-3.5 h-3.5" />, color: "#059669", bg: "#ECFDF5" },
  { id: "4", time: "16:30", title: "Shift Closing", subtitle: "Semua Cabang", icon: <Clock className="w-3.5 h-3.5" />, color: "#DC2626", bg: "#FEF2F2" },
];

export default function ScheduleWidget() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming Schedule</h3>
        <button className="text-xs font-medium text-indigo-500 hover:text-indigo-600">View all</button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {MOCK_SCHEDULE.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors min-w-[180px] shrink-0 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: s.bg, color: s.color }}>
              {s.icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-gray-400">{s.time}</span>
              </div>
              <p className="text-xs font-medium text-gray-900 truncate">{s.title}</p>
              <p className="text-[10px] text-gray-400 truncate">{s.subtitle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
