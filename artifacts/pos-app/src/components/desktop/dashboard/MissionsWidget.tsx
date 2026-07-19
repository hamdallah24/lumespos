interface Mission {
  id: string;
  name: string;
  status: "Running" | "Planning" | "Review";
  progress: number;
}

const MOCK_MISSIONS: Mission[] = [
  { id: "1", name: "Optimasi Stok Q3", status: "Running", progress: 68 },
  { id: "2", name: "Analisis Margin Kopi", status: "Running", progress: 42 },
  { id: "3", name: "Setup Auto-Order", status: "Planning", progress: 10 },
  { id: "4", name: "Laporan Bulanan Juni", status: "Review", progress: 90 },
  { id: "5", name: "Expand Cabang Baru", status: "Planning", progress: 5 },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  Running: { bg: "#ECFDF5", text: "#059669", bar: "#10B981" },
  Planning: { bg: "#EFF6FF", text: "#2563EB", bar: "#3B82F6" },
  Review: { bg: "#FEF3C7", text: "#D97706", bar: "#F59E0B" },
};

export default function MissionsWidget() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Missions Running</h3>
        <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
          {MOCK_MISSIONS.filter((m) => m.status === "Running").length} active
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {MOCK_MISSIONS.map((m) => {
          const colors = STATUS_COLORS[m.status];
          return (
            <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium text-gray-900 truncate">{m.name}</span>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: colors.bg, color: colors.text }}
                  >
                    {m.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${m.progress}%`, background: colors.bar }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-400 w-8 text-right">{m.progress}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
