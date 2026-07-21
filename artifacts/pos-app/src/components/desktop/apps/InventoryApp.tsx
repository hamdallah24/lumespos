import { BranchProvider } from "@/lib/branch";
import InventoryWorkspace from "@/modules/inventory/pages/InventoryWorkspace";

export default function InventoryApp() {
  return (
    <BranchProvider>
      <div className="h-full w-full bg-[#0a0e1a] overflow-hidden">
        <InventoryWorkspace />
      </div>
    </BranchProvider>
  );
}
