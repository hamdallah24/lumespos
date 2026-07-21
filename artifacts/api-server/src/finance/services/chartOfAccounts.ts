import { db, accountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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
    { code: "3000", name: "Modal", type: "equity", normalBalance: "credit", description: "Modal usaha" },
    { code: "3100", name: "Laba Ditahan", type: "equity", normalBalance: "credit", description: "Laba yang ditahan" },
    { code: "4000", name: "Penjualan", type: "revenue", normalBalance: "credit", description: "Pendapatan dari penjualan" },
    { code: "4100", name: "Pendapatan Jasa", type: "revenue", normalBalance: "credit", description: "Pendapatan dari jasa" },
    { code: "4200", name: "Pendapatan Lain", type: "revenue", normalBalance: "credit", description: "Pendapatan lain-lain" },
    { code: "5000", name: "Harga Pokok Penjualan", type: "expense", normalBalance: "debit", description: "Biaya bahan baku / HPP" },
    { code: "6000", name: "Biaya Gaji", type: "expense", normalBalance: "debit", description: "Biaya gaji karyawan" },
    { code: "6100", name: "Biaya Sewa", type: "expense", normalBalance: "debit", description: "Biaya sewa tempat" },
    { code: "6200", name: "Biaya Listrik", type: "expense", normalBalance: "debit", description: "Biaya listrik" },
    { code: "6300", name: "Biaya ATK", type: "expense", normalBalance: "debit", description: "Biaya alat tulis kantor" },
    { code: "6400", name: "Biaya Marketing", type: "expense", normalBalance: "debit", description: "Biaya pemasaran" },
    { code: "6500", name: "Biaya Lain", type: "expense", normalBalance: "debit", description: "Biaya operasional lainnya" },
  ];

  for (const account of defaultAccounts) {
    await db.insert(accountsTable).values(account);
  }
}
