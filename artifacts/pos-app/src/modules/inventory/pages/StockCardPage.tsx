import { useState } from "react";
import { useStockCard, useWarehouses, useRebuildProjections } from "../hooks/useInventory";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatRp } from "@/lib/format";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Search } from "lucide-react";

export default function StockCardPage() {
  const [branchId, setBranchId] = useState<number>(1);
  const [warehouseId, setWarehouseId] = useState<number>(0);
  const [itemType, setItemType] = useState<string>("ingredient");
  const [itemId, setItemId] = useState<number>(0);
  const [page, setPage] = useState(1);
  const [searchItem, setSearchItem] = useState("");

  const { data: warehouses } = useWarehouses(branchId);
  const { data, isLoading } = useStockCard(branchId, warehouseId, itemType, itemId, page);
  const rebuildMutation = useRebuildProjections();

  const selectedWarehouse = warehouseId || warehouses?.[0]?.id;
  const effectiveWarehouseId = selectedWarehouse || 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Stock Card</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => rebuildMutation.mutate()}
          disabled={rebuildMutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${rebuildMutation.isPending ? "animate-spin" : ""}`} />
          Rebuild Projections
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select
          value={branchId}
          onChange={(e) => { setBranchId(Number(e.target.value)); setWarehouseId(0); }}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value={1}>Branch 1</option>
          <option value={2}>Branch 2</option>
        </select>

        <select
          value={warehouseId}
          onChange={(e) => setWarehouseId(Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value={0}>All Warehouses</option>
          {warehouses?.map((w) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>

        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="ingredient">Bahan Baku</option>
          <option value="semi_finished">Setengah Jadi</option>
          <option value="product">Produk</option>
        </select>

        <Input
          type="number"
          placeholder="Item ID"
          value={itemId || ""}
          onChange={(e) => setItemId(Number(e.target.value))}
          className="h-9 text-xs"
        />
      </div>

      {rebuildMutation.isSuccess && (
        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
          Projections rebuilt: {rebuildMutation.data?.currentInventoryRows} inventory rows, {rebuildMutation.data?.fifoLayerRows} FIFO layers
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : effectiveWarehouseId && itemId ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">
              Movement History — {itemType} #{itemId}
              <span className="text-xs text-muted-foreground ml-2">({data?.total || 0} entries)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No movements recorded</p>
            ) : (
              <div className="space-y-1">
                {data?.items.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {entry.direction === "in" ? (
                        <ArrowUpRight className="w-3 h-3 text-green-600 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-red-600 shrink-0" />
                      )}
                      <span className="font-medium truncate">{entry.movementType}</span>
                      <span className="text-muted-foreground hidden sm:inline truncate">
                        {entry.description || ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={entry.direction === "in" ? "text-green-600" : "text-red-600"}>
                        {entry.direction === "in" ? "+" : "-"}{entry.qtyChange}
                      </span>
                      <span className="text-muted-foreground w-16 text-right">
                        {formatRp(entry.valueChange)}
                      </span>
                      <span className="text-muted-foreground w-8 text-right">
                        {entry.qtyAfter}
                      </span>
                      <span className="text-muted-foreground hidden sm:inline">
                        {format(new Date(entry.createdAt), "dd MMM HH:mm", { locale: id })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {data.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= data.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            Select a warehouse and enter Item ID to view movement history
          </CardContent>
        </Card>
      )}
    </div>
  );
}
