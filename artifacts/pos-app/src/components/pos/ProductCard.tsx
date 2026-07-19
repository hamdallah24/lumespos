import { useState } from "react";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { formatRp } from "@/lib/format";

type Product = {
  id: number;
  name: string;
  price: number;
  categoryId?: number;
  imageUrl?: string;
  hasVariants?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
};

interface ProductCardProps {
  product: Product;
  index: number;
  onAdd: (product: Product) => void;
}

export default function ProductCard({ product, index, onAdd }: ProductCardProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const imgSrc = product.imageUrl
    ? product.imageUrl.startsWith("http")
      ? product.imageUrl
      : `/api/storage${product.imageUrl}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer active:scale-[0.97] transition-transform min-w-0"
      onClick={() => onAdd(product)}
    >
      <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden">
        {imgSrc && !imgFailed ? (
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full aspect-square object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-background flex items-center justify-center text-muted-foreground font-bold text-xl md:text-3xl shadow-sm">
            {product.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="p-2 md:p-3 min-w-0">
        <h3 className="font-semibold text-xs md:text-sm truncate">{product.name}</h3>
        <p className="text-primary font-bold text-sm md:text-base mt-0.5 md:mt-1 truncate">
          {product.hasVariants && product.minPrice != null
            ? `${formatRp(product.minPrice)} - ${formatRp(product.maxPrice ?? product.minPrice)}`
            : formatRp(product.price)}
        </p>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd(product);
          }}
          className="w-full mt-1.5 md:mt-2 h-8 md:h-10 rounded-xl bg-primary text-primary-foreground font-medium text-xs md:text-sm active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5"
        >
          <Plus size={14} />
          Tambah
        </button>
      </div>
    </motion.div>
  );
}
