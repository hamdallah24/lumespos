import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatRp } from "@/lib/format";

interface CloseShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  shiftId: number;
  openingBalance: number;
}

interface SalesData {
  cash: number;
  qris: number;
  card: number;
  total: number;
}

export function CloseShiftDialog({ open, onClose, onSuccess, shiftId, openingBalance }: CloseShiftDialogProps) {
  const [closingBalance, setClosingBalance] = useState("");
  const [photoProofUrl, setPhotoProofUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [result, setResult] = useState<{ expectedBalance: number; difference: number } | null>(null);

  // Ambil data penjualan shift
  useEffect(() => {
    if (open && shiftId) {
      const fetchSales = async () => {
        setIsLoadingSales(true);
        try {
          const res = await fetch(`/api/shift/sales?shiftId=${shiftId}`, {
            credentials: "include",
          });
          const data = await res.json();
          if (res.ok) {
            setSalesData({
              cash: data.cash ?? 0,
              qris: data.qris ?? 0,
              card: data.card ?? 0,
              total: (data.cash ?? 0) + (data.qris ?? 0) + (data.card ?? 0),
            });
          } else {
            console.error("Failed to fetch sales:", data);
            setSalesData({ cash: 0, qris: 0, card: 0, total: 0 });
          }
        } catch (error) {
          console.error("Error fetching sales:", error);
          setSalesData({ cash: 0, qris: 0, card: 0, total: 0 });
        } finally {
          setIsLoadingSales(false);
        }
      };
      fetchSales();
    }
  }, [open, shiftId]);

  const handleSubmit = async () => {
    const balance = parseFloat(closingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error("Uang akhir harus diisi dengan benar");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shift/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shiftId,
          closingBalance: balance,
          photoProofUrl: photoProofUrl || null,
        }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menutup shift");

      setResult({
        expectedBalance: data.shift.expectedBalance,
        difference: data.shift.difference,
      });

      if (data.shift.difference >= 0) {
        toast.success(`Shift ditutup. Kelebihan: ${formatRp(data.shift.difference)}`);
      } else {
        toast.warning(`Shift ditutup. Kekurangan: ${formatRp(Math.abs(data.shift.difference))}`);
      }
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menutup shift");
    } finally {
      setLoading(false);
    }
  };

  const expectedCash = (salesData?.cash || 0) + openingBalance;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Tutup Shift</DialogTitle>
          <DialogDescription>
            Masukkan uang akhir yang ada di laci kas.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            {/* Ringkasan Penjualan per Metode */}
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm font-semibold border-b pb-1 mb-1">
                <span>Ringkasan Penjualan Shift</span>
                <span></span>
              </div>
              {isLoadingSales ? (
                <div className="flex justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                </div>
              ) : salesData ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span>💵 Tunai (Kas):</span>
                    <span className="font-semibold">{formatRp(salesData.cash)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>📱 QRIS (Rekening):</span>
                    <span className="font-semibold">{formatRp(salesData.qris)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>💳 Kartu (Rekening):</span>
                    <span className="font-semibold">{formatRp(salesData.card)}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-1 border-t mt-1 font-semibold">
                    <span>💰 Total Omzet Shift:</span>
                    <span className="font-bold text-primary">{formatRp(salesData.total)}</span>
                  </div>
                </>
              ) : (
                <div className="text-center text-xs text-muted-foreground py-2">
                  Gagal mengambil data penjualan
                </div>
              )}
            </div>

            {/* Perhitungan Kas */}
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex justify-between text-sm">
                <span>Modal Awal (Kas):</span>
                <span>{formatRp(openingBalance)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Penjualan Tunai (Kas):</span>
                <span>{formatRp(salesData?.cash || 0)}</span>
              </div>
              <div className="flex justify-between text-sm mt-2 pt-1 border-t border-primary/20">
                <span className="font-semibold">Uang yang Diharapkan di Kas:</span>
                <span className="font-bold text-primary">{formatRp(expectedCash)}</span>
              </div>
            </div>

            {/* Input Uang Akhir */}
            <div>
              <Label>Uang Akhir di Laci Kas (Rp)</Label>
              <Input
                type="number"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="cth. 550000"
                className="mt-1"
                autoFocus
              />
            </div>

            {/* Input Foto Bukti */}
            <div>
              <Label>URL Foto Bukti (opsional)</Label>
              <Input
                type="text"
                value={photoProofUrl}
                onChange={(e) => setPhotoProofUrl(e.target.value)}
                placeholder="https://..."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Upload foto stok dan uang akhir ke cloud, lalu paste URL-nya
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Batal
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !salesData}>
                {loading ? "Memproses..." : "Tutup Shift"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className={`p-4 rounded-lg text-center ${result.difference >= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <p className="text-sm text-muted-foreground">Shift Berhasil Ditutup</p>
              <p className={`text-2xl font-bold mt-1 ${result.difference >= 0 ? "text-green-600" : "text-red-600"}`}>
                {result.difference >= 0 ? formatRp(result.difference) : `-${formatRp(Math.abs(result.difference))}`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {result.difference >= 0 ? "Kelebihan" : "Kekurangan"}
              </p>
              <div className="mt-3 text-xs text-muted-foreground">
                <p>Uang diharapkan di kas: {formatRp(result.expectedBalance)}</p>
              </div>
            </div>
            <Button onClick={onSuccess} className="w-full">
              Kembali ke Kasir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}