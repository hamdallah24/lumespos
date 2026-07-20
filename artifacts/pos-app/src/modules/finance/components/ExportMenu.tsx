import React, { useState } from "react";
import { useBranch } from "@/lib/branch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import { TRANSACTION_CATEGORIES } from "../types";

export default function ExportMenu() {
  const { branchId } = useBranch();
  const [format, setFormat] = useState("csv");
  const [category, setCategory] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (branchId) params.set("branchId", String(branchId));
      if (category) params.set("category", category);
      params.set("format", format);

      const res = await fetch(`/api/finance/export?${params.toString()}`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Export gagal");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `finance-export.${format === "excel" ? "xml" : format === "pdf" ? "html" : "csv"}`;
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
    <div className="flex items-center gap-2">
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="Semua" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Kategori</SelectItem>
          {Object.entries(TRANSACTION_CATEGORIES).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={format} onValueChange={setFormat}>
        <SelectTrigger className="w-24 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="csv">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              CSV
            </div>
          </SelectItem>
          <SelectItem value="excel">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3 h-3" />
              Excel
            </div>
          </SelectItem>
          <SelectItem value="pdf">
            <div className="flex items-center gap-2">
              <File className="w-3 h-3" />
              PDF
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
        className="gap-2"
      >
        <Download className="w-4 h-4" />
        {isExporting ? "Exporting..." : "Export"}
      </Button>
    </div>
  );
}
