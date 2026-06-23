import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { getErrorMessage } from "@/lib/error";

import { X } from "lucide-react";

interface StartShiftDialogProps {
  open: boolean;
  onStart: () => void;
  branchId: number;
  cashierId: number;
  cashierName: string;
  role?: string;
}

export function StartShiftDialog({ open, onStart, branchId, cashierId, cashierName, role }: StartShiftDialogProps) {
  const [openingBalance, setOpeningBalance] = useState("");
  const [loading, setLoading] = useState(false);
  const isOwnerManager = role === "owner" || role === "manager";

  const handleStart = async () => {
    const balance = parseFloat(openingBalance);
    if (!isOwnerManager && (isNaN(balance) || balance < 0)) {
      toast.error("Uang modal awal harus diisi dengan benar", { duration: 1000 });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/shift/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: Number(branchId),
          cashierId: Number(cashierId),
          cashierName,
          openingBalance: isOwnerManager && (isNaN(balance) || balance < 0) ? 0 : balance,
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Gagal memulai shift");
      }
      
      toast.success(`Shift dimulai. Modal awal: ${new Intl.NumberFormat("id-ID", { 
        style: "currency", 
        currency: "IDR" 
      }).format(isOwnerManager && (isNaN(balance) || balance < 0) ? 0 : balance)}`);
      
      onStart();
    } catch (err) {
      toast.error(getErrorMessage(err, "Gagal memulai shift"), { duration: 1000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="relative">
          {isOwnerManager && (
            <button
              className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
              onClick={onStart}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <DialogTitle className="text-xl">Mulai Shift</DialogTitle>
          <DialogDescription>
            {isOwnerManager
              ? "Isi uang modal awal jika bertugas sebagai kasir, atau klik X untuk lewati."
              : "Isi uang modal awal yang ada di laci kas sebelum memulai transaksi."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">
              Uang Modal Awal (Rp) {!isOwnerManager && <span className="text-red-500">*</span>}
            </label>
            <Input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder={isOwnerManager ? "Kosongkan jika hanya melihat dashboard" : "cth. 500000"}
              autoFocus
              className="mt-1"
            />
            {isOwnerManager && (
              <p className="text-xs text-muted-foreground mt-1">Opsional untuk owner/manager</p>
            )}
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          {isOwnerManager && (
            <Button variant="outline" onClick={onStart} className="flex-1">Lewati</Button>
          )}
          <Button onClick={handleStart} disabled={loading} className="flex-1">
            {loading ? "Memulai..." : "Mulai Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}