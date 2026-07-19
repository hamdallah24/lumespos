import { AlertCircle, RefreshCw } from "lucide-react";

interface BusinessCardProps {
  title: string;
  amount: string;
  change: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function CardSkeleton() {
  return (
    <div className="px-4 py-3.5 rounded-2xl bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="h-3 w-16 bg-gray-100 rounded-full mb-2.5" />
      <div className="h-5 w-24 bg-gray-100 rounded-full mb-1.5" />
      <div className="h-2.5 w-12 bg-gray-100 rounded-full" />
    </div>
  );
}

function CardError({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <div className="px-4 py-3.5 rounded-2xl bg-white border border-red-100">
      <p className="text-[11px] text-[#6B7280] mb-1">{title}</p>
      <div className="flex items-center gap-1.5 text-[#EF4444]">
        <AlertCircle className="w-3.5 h-3.5" />
        <span className="text-[10px]">Gagal memuat</span>
      </div>
      <button
        onClick={onRetry}
        className="mt-2 flex items-center gap-1 text-[10px] text-[#2563EB] font-medium"
      >
        <RefreshCw className="w-3 h-3" />
        Coba lagi
      </button>
    </div>
  );
}

function CardEmpty({ title }: { title: string }) {
  return (
    <div className="px-4 py-3.5 rounded-2xl bg-white" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <p className="text-[11px] text-[#6B7280] mb-1">{title}</p>
      <p className="text-[14px] font-bold text-[#111827]">—</p>
      <p className="text-[11px] text-[#6B7280]">Tidak ada data</p>
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

  return (
    <div
      className="px-4 py-3.5 rounded-2xl bg-white"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <p className="text-[11px] text-[#6B7280] mb-1">{title}</p>
      <p className="text-[16px] font-bold text-[#111827] leading-tight">
        {amount}
      </p>
      <div className="flex items-center gap-1 mt-1">
        <span
          className="text-[11px] font-medium"
          style={{ color: isPositive ? "#10B981" : "#EF4444" }}
        >
          {isPositive ? "↑" : "↓"} {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}
