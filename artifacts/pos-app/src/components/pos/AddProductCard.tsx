import { Plus } from "lucide-react";

interface AddProductCardProps {
  onClick: () => void;
}

export default function AddProductCard({ onClick }: AddProductCardProps) {
  return (
    <button
      onClick={onClick}
      className="border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary/70 transition-colors min-h-[220px] md:min-h-[260px] active:scale-[0.97]"
    >
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <Plus className="w-6 h-6" />
      </div>
      <span className="text-xs md:text-sm font-medium">Tambah Produk</span>
    </button>
  );
}
