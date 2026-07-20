import React from "react";
import { useTransactionDetail, useJournalEntries } from "../hooks/useFinance";
import { formatRp, formatDate } from "@/lib/format";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Hash,
  User,
  Tag,
  Link,
  BookOpen,
  FileText,
  Clock,
  CheckCircle,
} from "lucide-react";
import { TRANSACTION_CATEGORIES } from "../types";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

export default function TransactionDetailDrawer({
  transactionId,
  open,
  onClose,
}: {
  transactionId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: journalData, isLoading: journalLoading } = useJournalEntries(
    transactionId || undefined
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Detail Transaksi</SheetTitle>
          <SheetDescription>
            Informasi lengkap transaksi dan jurnal yang terkait
          </SheetDescription>
        </SheetHeader>

        {journalLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !journalData ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Transaksi tidak ditemukan
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4">
                <DetailRow
                  icon={Hash}
                  label="Transaction ID"
                  value={`#${transactionId}`}
                />
                <Separator />
                <DetailRow
                  icon={Tag}
                  label="Kategori"
                  value={
                    <Badge variant="outline">
                      {TRANSACTION_CATEGORIES[journalData.transaction?.category]?.label ||
                        journalData.transaction?.category}
                    </Badge>
                  }
                />
                <Separator />
                <DetailRow
                  icon={FileText}
                  label="Deskripsi"
                  value={journalData.transaction?.description}
                />
                <Separator />
                <DetailRow
                  icon={Hash}
                  label="Jumlah"
                  value={
                    <span
                      className={
                        journalData.transaction?.type === "income"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {journalData.transaction?.type === "income" ? "+" : "-"}
                      {formatRp(parseFloat(journalData.transaction?.amount || "0"))}
                    </span>
                  }
                />
                <Separator />
                <DetailRow
                  icon={CheckCircle}
                  label="Status"
                  value={
                    <Badge
                      variant={
                        journalData.transaction?.status === "completed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {journalData.transaction?.status === "completed"
                        ? "Selesai"
                        : journalData.transaction?.status}
                    </Badge>
                  }
                />
                <Separator />
                <DetailRow
                  icon={Clock}
                  label="Dibuat"
                  value={formatDate(journalData.transaction?.createdAt?.toString() || "")}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Jurnal Otomatis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {journalData.journal.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Tidak ada jurnal
                  </p>
                ) : (
                  <div className="space-y-2">
                    {journalData.journal.map((entry: any) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium">
                            {entry.description || "Jurnal Entry"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Account #{entry.accountId}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          {parseFloat(entry.debit) > 0 && (
                            <p className="text-xs text-green-600">
                              Debit: {formatRp(parseFloat(entry.debit))}
                            </p>
                          )}
                          {parseFloat(entry.credit) > 0 && (
                            <p className="text-xs text-red-600">
                              Kredit: {formatRp(parseFloat(entry.credit))}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
