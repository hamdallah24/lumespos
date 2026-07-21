import { db, accountsTable, transactionsTable, ledgerEntriesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

export interface CashPositionItem {
  code: string;
  name: string;
  balance: number;
}

export interface CashPosition {
  cash: number;
  bank: number;
  eWallet: number;
  accountsReceivable: number;
  accountsPayable: number;
  total: number;
}

async function getAccountBalance(code: string, branchId?: number): Promise<number> {
  const account = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.code, code))
    .then((r) => r[0]);

  if (!account) return 0;

  let query = db
    .select({
      totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
    })
    .from(ledgerEntriesTable);

  const conditions = [eq(ledgerEntriesTable.accountId, account.id)];
  if (branchId) {
    query = query.innerJoin(transactionsTable, eq(ledgerEntriesTable.transactionId, transactionsTable.id)) as any;
    conditions.push(eq(transactionsTable.branchId, branchId));
  }

  const [result] = await query.where(and(...conditions));

  if (!result) return 0;

  const totalDebit = parseFloat(result.totalDebit);
  const totalCredit = parseFloat(result.totalCredit);

  return account.normalBalance === "debit"
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;
}

export async function getCashPosition(branchId?: number): Promise<CashPosition> {
  const [cash, bank, eWallet, accountsReceivable, accountsPayable] = await Promise.all([
    getAccountBalance("1000", branchId),
    getAccountBalance("1100", branchId),
    getAccountBalance("1250", branchId),
    getAccountBalance("1300", branchId),
    getAccountBalance("2000", branchId),
  ]);

  return {
    cash,
    bank,
    eWallet,
    accountsReceivable,
    accountsPayable,
    total: cash + bank + eWallet + accountsReceivable - accountsPayable,
  };
}

export async function getCashPositionItems(branchId?: number): Promise<CashPositionItem[]> {
  const [cash, bank, eWallet, accountsReceivable, accountsPayable] = await Promise.all([
    getAccountBalance("1000", branchId),
    getAccountBalance("1100", branchId),
    getAccountBalance("1250", branchId),
    getAccountBalance("1300", branchId),
    getAccountBalance("2000", branchId),
  ]);

  return [
    { code: "1000", name: "Kas", balance: cash },
    { code: "1100", name: "Bank", balance: bank },
    { code: "1250", name: "E-Wallet", balance: eWallet },
    { code: "1300", name: "Piutang Usaha", balance: accountsReceivable },
    { code: "2000", name: "Hutang Usaha", balance: accountsPayable },
  ];
}
