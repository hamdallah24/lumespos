import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle, Clock } from "lucide-react";

interface Insight {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  time: string;
}

const MOCK_INSIGHTS: Insight[] = [
  {
    id: "1",
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    iconBg: "#FEF3C7",
    title: "Margin turun 3.2% minggu ini",
    description: "Harga bahan baku naik, pertimbangkan调整 harga jual",
    time: "10 menit lalu",
  },
  {
    id: "2",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    iconBg: "#D1FAE5",
    title: "Prediksi cashflow minggu depan",
    description: "Cashflow bersih diprediksi Rp 12.5jt (naik 8%)",
    time: "30 menit lalu",
  },
  {
    id: "3",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    iconBg: "#FEE2E2",
    title: "Stok Arabica hampir habis",
    description: "Tersisa 2.5kg, auto-order akan trigger dalam 3 hari",
    time: "1 jam lalu",
  },
  {
    id: "4",
    icon: <Clock className="w-3.5 h-3.5" />,
    iconBg: "#EDE9FE",
    title: "Jatuh tempo gaji karyawan",
    description: "Gaji 12 karyawan jatuh tempo 25 Juli",
    time: "2 jam lalu",
  },
];

export default function AIInsights() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-gray-900">AI Insight</h3>
        </div>
        <button className="text-xs font-medium text-indigo-500 hover:text-indigo-600">View all</button>
      </div>
      <div className="flex flex-col gap-2">
        {MOCK_INSIGHTS.map((insight) => (
          <div
            key={insight.id}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: insight.iconBg }}>
              {insight.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{insight.title}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{insight.description}</p>
            </div>
            <span className="text-[10px] text-gray-300 whitespace-nowrap mt-1">{insight.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
