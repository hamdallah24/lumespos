export function formatRp(amount: number): string {
  if (isNaN(amount)) return "Rp 0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Format angka decimal untuk stok & kuantitas
// contoh: 1000.5 → "1.000,5" | 250 → "250"
export function formatQty(amount: number, maxDecimals = 2): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(amount);
}

// Format gram/ml/pcs dengan satuan
// contoh: formatUnit(1500.5, "ml") → "1.500,5 ml"
export function formatUnit(amount: number, unit: string, maxDecimals = 2): string {
  return `${formatQty(amount, maxDecimals)} ${unit}`;
}

// Format persentase
// contoh: formatPct(3.5) → "3,5%"
export function formatPct(value: number, maxDecimals = 1): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
    style: 'percent',
  }).format(value / 100);
}

// Format decimal untuk input resep BOM
// contoh: formatRecipeQty(0.5) → "0,5" | formatRecipeQty(100) → "100"
export function formatRecipeQty(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(amount);
}