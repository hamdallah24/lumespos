import { db, accountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { InsertAccount, Account } from "@workspace/db";

export async function getAllAccounts(): Promise<Account[]> {
  return db.select().from(accountsTable).where(eq(accountsTable.isActive, true));
}

export async function getAccountByCode(code: string): Promise<Account | undefined> {
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.code, code));
  return account;
}

export async function getAccountById(id: number): Promise<Account | undefined> {
  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  return account;
}

export async function getAccountsByType(type: string): Promise<Account[]> {
  return db.select().from(accountsTable).where(and(eq(accountsTable.type, type as any), eq(accountsTable.isActive, true)));
}

export async function createAccount(data: InsertAccount): Promise<Account> {
  const [account] = await db.insert(accountsTable).values(data).returning();
  return account;
}

export async function updateAccount(id: number, data: Partial<InsertAccount>): Promise<Account | undefined> {
  const [account] = await db.update(accountsTable).set({ ...data, updatedAt: new Date() }).where(eq(accountsTable.id, id)).returning();
  return account;
}

export async function initializeDefaultCOA(): Promise<void> {
  const existing = await db.select().from(accountsTable).limit(1);
  if (existing.length > 0) return;

  const defaultAccounts: InsertAccount[] = [
    { code: "1000", name: "Kas", type: "asset", normalBalance: "debit", description: "Kas tunai" },
    { code: "1100", name: "Bank", type: "asset", normalBalance: "debit", description: "Rekening bank" },
    { code: "1200", name: "Persediaan", type: "asset", normalBalance: "debit", description: "Persediaan barang" },
    { code: "1250", name: "E-Wallet", type: "asset", normalBalance: "debit", description: "Saldo e-wallet (GoPay, OVO, Dana, dll)" },
    { code: "1300", name: "Piutang Usaha", type: "asset", normalBalance: "debit", description: "Piutang dari pelanggan" },
    { code: "2000", name: "Hutang Usaha", type: "liability", normalBalance: "credit", description: "Hutang kepada supplier" },
    { code: "2100", name: "Hutang Pajak", type: "liability", normalBalance: "credit", description: "Pajak yang belum dibayar" },
    { code: "3000", name: "Modal Pemilik", type: "equity", normalBalance: "credit", description: "Modal dari pemilik" },
    { code: "3100", name: "Laba Ditahan", type: "equity", normalBalance: "credit", description: "Laba yang ditahan" },
    { code: "4000", name: "Penjualan", type: "revenue", normalBalance: "credit", description: "Pendapatan dari penjualan" },
    { code: "4100", name: "Pendapatan Jasa", type: "revenue", normalBalance: "credit", description: "Pendapatan dari jasa" },
    { code: "5000", name: "Bahan Baku", type: "expense", normalBalance: "debit", description: "Biaya bahan baku" },
    { code: "5100", name: "Gaji", type: "expense", normalBalance: "debit", description: "Biaya gaji karyawan" },
    { code: "5200", name: "Listrik", type: "expense", normalBalance: "debit", description: "Biaya listrik" },
    { code: "5300", name: "Internet", type: "expense", normalBalance: "debit", description: "Biaya internet" },
    { code: "5400", name: "Sewa", type: "expense", normalBalance: "debit", description: "Biaya sewa tempat" },
    { code: "5500", name: "Transportasi", type: "expense", normalBalance: "debit", description: "Biaya transportasi" },
  ];

  for (const account of defaultAccounts) {
    await db.insert(accountsTable).values(account);
  }
}
