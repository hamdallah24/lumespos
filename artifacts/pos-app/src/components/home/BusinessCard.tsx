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
    ? "3,20 11,16 19,17 27,12 35,14 43,9 51,11 59,7 67,9 75,5 83,6 91,3 97,6"
    : "3,6 11,4 19,8 27,5 35,11 43,7 51,13 59,9 67,16 75,12 83,18 91,14 97,20";
  return (
    <svg
      viewBox="0 0 100 24"
      className="w-full"
      preserveAspectRatio="none"
      style={{ height: 23, opacity: 0.7 }}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CardSkeleton() {
  return (
    <div className="p-6 rounded-[28px] bg-white" style={{ height: 128, boxShadow: "0 8px 30px rgba(15,23,42,0.06)" }}>
      <div className="h-3 w-20 bg-gray-100 rounded-full mb-3" />
      <div className="h-8 w-32 bg-gray-100 rounded-full mb-3" />
      <div className="h-3.5 w-16 bg-gray-100 rounded-full" />
    </div>
  );
}

function CardError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="p-6 rounded-[28px] bg-white border border-red-100" style={{ height: 128 }}>
      <p className="text-[12px] text-[#6B7280] font-medium mb-1">{title}</p>
      <div className="flex items-center gap-1.5 text-[#EF4444]">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-[11px]">Gagal memuat</span>
      </div>
      <button
        onClick={onRetry}
        className="mt-1.5 flex items-center gap-1 text-[11px] text-[#2563EB] font-semibold"
      >
        <RefreshCw className="w-3 h-3" />
        Coba lagi
      </button>
    </div>
  );
}

function CardEmpty({ title }: { title: string }) {
  return (
    <div className="p-6 rounded-[28px] bg-white" style={{ height: 128, boxShadow: "0 8px 30px rgba(15,23,42,0.06)" }}>
      <p className="text-[12px] text-[#6B7280] font-medium">{title}</p>
      <p className="text-[28px] font-bold text-[#111827] mt-1">—</p>
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
      className="p-6 rounded-[28px] bg-white relative overflow-hidden active:scale-[0.985] transition-transform duration-180 cursor-pointer"
      style={{ height: 128, boxShadow: "0 8px 30px rgba(15,23,42,0.06)" }}
    >
      <div className="relative z-10 flex flex-col h-full">
        <p className="text-[12px] text-[#6B7280] font-medium">{title}</p>
        <p className="text-[30px] font-bold text-[#000] leading-tight tracking-[-0.01em] mt-0.5 mb-auto">
          {amount}
        </p>
        {!isMission && (
          <div className="flex items-center gap-1.5">
            <span
              className="text-[14px] font-semibold"
              style={{ color: isPositive ? "#10B981" : "#EF4444" }}
            >
              {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
            </span>
          </div>
        )}
      </div>
      <div className="absolute bottom-1 left-3 right-3 h-[23px]">
        <Sparkline positive={isPositive} />
      </div>
    </div>
  );
}
