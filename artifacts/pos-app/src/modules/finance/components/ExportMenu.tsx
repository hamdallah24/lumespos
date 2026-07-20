import React, { useState } from "react";
import { useBranch } from "@/lib/branch";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function ExportMenu() {
  const { branchId } = useBranch();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set("branchId", String(branchId));
      params.set("format", "csv");

      const res = await fetch(`/api/finance/export?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Export gagal");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-export.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
        className="gap-1.5 h-8 text-xs"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{isExporting ? "Exporting..." : "Export"}</span>
      </Button>
    </div>
  );
}
