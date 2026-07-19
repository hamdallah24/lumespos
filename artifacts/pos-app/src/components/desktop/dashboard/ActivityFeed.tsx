import { ShoppingCart, ArrowUpRight, ArrowDownRight, Wallet, CreditCard, Zap } from "lucide-react";

interface Activity {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  amount?: string;
  positive?: boolean;
}

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: "1",
    icon: <ShoppingCart className="w-3.5 h-3.5" />,
    iconBg: "#EEF2FF",
    title: "Penjualan POS #1284",
    subtitle: "Lumé's Coffee · 2 menit lalu",
    amount: "+Rp 125.000",
    positive: true,
  },
  {
    id: "2",
    icon: <Wallet className="w-3.5 h-3.5" />,
    iconBg: "#FEF2F2",
    title: "Pembayaran Supplier",
    subtitle: "PT Kopi Nusantara · 15 menit lalu",
    amount: "-Rp 2.500.000",
    positive: false,
  },
  {
    id: "3",
    icon: <CreditCard className="w-3.5 h-3.5" />,
    iconBg: "#F0FDF4",
    title: "Pembayaran QRIS",
    subtitle: "Customer #892 · 30 menit lalu",
    amount: "+Rp 87.500",
    positive: true,
  },
  {
    id: "4",
    icon: <Zap className="w-3.5 h-3.5" />,
    iconBg: "#FFFBEB",
    title: "Auto-Order Stok",
    subtitle: "Sistem · 1 jam lalu",
    amount: "-Rp 450.000",
    positive: false,
  },
];

export default function ActivityFeed() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-xs font-medium text-indigo-500 hover:text-indigo-600">View all</button>
      </div>
      <div className="flex flex-col gap-3">
        {MOCK_ACTIVITIES.map((a) => (
          <div key={a.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: a.iconBg }}>
              {a.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
              <p className="text-[11px] text-gray-400 truncate">{a.subtitle}</p>
            </div>
            {a.amount && (
              <span className={`text-sm font-semibold whitespace-nowrap ${a.positive ? "text-emerald-500" : "text-rose-500"}`}>
                {a.amount}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
