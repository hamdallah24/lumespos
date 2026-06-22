import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { apiFetch } from "@/lib/csrf";
import { getErrorMessage } from "@/lib/error";

interface StartShiftDialogProps {
  open: boolean;
  onStart: () => void;
  branchId: number;
  cashierId: number;
  cashierName: string;
}

export function StartShiftDialog({ open, onStart, branchId, cashierId, cashierName }: StartShiftDialogProps) {
  const [openingBalance, setOpeningBalance] = useState("");
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    const balance = parseFloat(openingBalance);
    if (isNaN(balance) || balance < 0) {
      toast.error("Uang modal awal harus diisi dengan benar");
      return;
      console.log("cashierId being sent:", cashierId);
console.log("branchId being sent:", branchId);
    }

    setLoading(true);
    try {
      console.log("Sending start shift request:", {
        branchId: Number(branchId),
        cashierId: Number(cashierId),
        cashierName,
        openingBalance: balance,
      });

      const res = await apiFetch("/api/shift/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: Number(branchId),
          cashierId: Number(cashierId),
          cashierName,
          openingBalance: balance,
        }),
        credentials: "include",
      });

      const data = await res.json();
      console.log("Response:", { status: res.status, data });

      if (!res.ok) {
        throw new Error(data.error || "Gagal memulai shift");
      }
      
      toast.success(`Shift dimulai. Modal awal: ${new Intl.NumberFormat("id-ID", { 
        style: "currency", 
        currency: "IDR" 
      }).format(balance)}`);
      
      onStart();
    } catch (err) {
      console.error("Start shift error:", err);
      toast.error(getErrorMessage(err, "Gagal memulai shift"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Mulai Shift</DialogTitle>
          <DialogDescription>
            Isi uang modal awal yang ada di laci kas sebelum memulai transaksi.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">Uang Modal Awal (Rp)</label>
            <Input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="cth. 500000"
              autoFocus
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleStart} disabled={loading} className="w-full">
            {loading ? "Memulai..." : "Mulai Shift"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}