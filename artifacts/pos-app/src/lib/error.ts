const isProd = import.meta.env.PROD;

export function getErrorMessage(err: unknown, fallback = "Gagal, coba lagi"): string {
  if (isProd) return fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === "string") return err || fallback;
  return fallback;
}
