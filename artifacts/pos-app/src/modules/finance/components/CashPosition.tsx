import React from "react";
import { useCashPosition } from "../hooks/useFinance";
import { usePlatformFilter } from "@/platform/filter";
import { formatRp } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, Building2, CreditCard, Users, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";

function PositionCard({
  title,
  value,
  icon: Icon,
  color,
  isNegative,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  isNegative?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl p-3"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
            {title}
          </p>
          <p
            className={`text-sm font-bold mt-1 tracking-tight truncate ${
              isNegative ? "text-red-600" : ""
            }`}
          >
            {isNegative ? "-" : ""}
            {formatRp(Math.abs(value))}
          </p>
        </div>
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ml-2 ${color}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
}

export default function CashPosition() {
  const { state: filter } = usePlatformFilter();
  const branchId = filter.branchIds.length === 1 ? filter.branchIds[0] : undefined;
  const { data, isLoading } = useCashPosition(branchId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const items = data?.items || [];
  const position = data?.position;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Posisi Kas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <PositionCard
            title="Kas"
            value={position?.cash || 0}
            icon={Wallet}
            color="bg-blue-500/10 text-blue-600"
          />
          <PositionCard
            title="Bank"
            value={position?.bank || 0}
            icon={Building2}
            color="bg-purple-500/10 text-purple-600"
          />
          <PositionCard
            title="E-Wallet"
            value={position?.eWallet || 0}
            icon={CreditCard}
            color="bg-orange-500/10 text-orange-600"
          />
          <PositionCard
            title="Piutang Usaha"
            value={position?.accountsReceivable || 0}
            icon={Users}
            color="bg-green-500/10 text-green-600"
          />
          <PositionCard
            title="Hutang Usaha"
            value={position?.accountsPayable || 0}
            icon={TrendingDown}
            color="bg-red-500/10 text-red-600"
            isNegative
          />
        </div>

        {position && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Posisi Kas</span>
              <span className="text-sm font-bold">{formatRp(position.total)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
