import { AlertCircle, RefreshCw } from "lucide-react";

interface BusinessCardProps {
  title: string;
  amount: string;
  change: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function Sparkline({ positive }: { positive: boolean }) {
  const color = positive ? "#10B981" : "#EF4444";
  const points = positive
    ? "5,18 15,14 25,15 35,10 45,12 55,8 65,10 75,6 85,8 95,4"
    : "5,8 15,5 25,9 35,6 45,10 55,7 65,12 75,9 85,14 95,11";
  return (
    <svg viewBox="0 0 100 22" className="w-full h-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
      />
    </svg>
  );
}

function CardSkeleton() {
  return (
    <div className="p-5 rounded-[24px] bg-white" style={{ height: 120, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="h-3 w-20 bg-gray-100 rounded-full mb-3" />
      <div className="h-7 w-28 bg-gray-100 rounded-full mb-3" />
      <div className="h-2.5 w-14 bg-gray-100 rounded-full" />
    </div>
  );
}

function CardError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="p-5 rounded-[24px] bg-white border border-red-100" style={{ height: 120 }}>
      <p className="text-[11px] text-[#6B7280] mb-1">{title}</p>
      <div className="flex items-center gap-1.5 text-[#EF4444]">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-[11px]">Gagal memuat</span>
      </div>
      <button
        onClick={onRetry}
        className="mt-1.5 flex items-center gap-1 text-[11px] text-[#2563EB] font-medium"
      >
        <RefreshCw className="w-3 h-3" />
        Coba lagi
      </button>
    </div>
  );
}

function CardEmpty({ title }: { title: string }) {
  return (
    <div className="p-5 rounded-[24px] bg-white" style={{ height: 120, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <p className="text-[12px] text-[#6B7280] font-medium">{title}</p>
      <p className="text-[22px] font-bold text-[#111827] mt-1">—</p>
      <p className="text-[11px] text-[#6B7280] mt-0.5">Tidak ada data</p>
    </div>
  );
}

export default function BusinessCard({
  title,
  amount,
  change,
  loading,
  error,
  onRetry,
}: BusinessCardProps) {
  if (loading) return <CardSkeleton />;
  if (error) return <CardError title={title} onRetry={onRetry} />;
  if (amount === "—") return <CardEmpty title={title} />;

  const isPositive = change >= 0;
  const isMission = title === "Misi";

  return (
    <div
      className="p-5 rounded-[24px] bg-white relative overflow-hidden active:scale-[0.98] transition-transform"
      style={{ height: 120, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <div className="relative z-10 flex flex-col h-full">
        <p className="text-[12px] text-[#6B7280] font-medium mb-1">{title}</p>
        <p className="text-[22px] font-bold text-[#111827] leading-tight tracking-tight mb-auto">
          {amount}
        </p>
        {!isMission && (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[12px] font-semibold"
              style={{ color: isPositive ? "#10B981" : "#EF4444" }}
            >
              {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-[24px] opacity-30">
        <Sparkline positive={isPositive} />
      </div>
    </div>
  );
}
