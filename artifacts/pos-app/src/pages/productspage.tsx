import { RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

async function fetchProducts() {
  const res = await fetch('/api/products');
  if (!res.ok) throw new Error('Gagal memuat produk');
  return res.json();
}

export default function ProductsPage() {
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Daftar Produk</h1>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh Stok
        </button>
      </div>

      {isLoading ? (
        <p>Memuat...</p>
      ) : (
        <ul>
          {products?.map((product: any) => (
            <li key={product.id}>{product.name} - Stok: {product.stock}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
