import { db, accountsTable, ledgerEntriesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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

async function getAccountBalance(code: string): Promise<number> {
  const account = await db
    .select()
    .from(accountsTable)
    .where(eq(accountsTable.code, code))
    .then((r) => r[0]);

  if (!account) return 0;

  const [result] = await db
    .select({
      totalDebit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.debit}), 0)`,
      totalCredit: sql<string>`COALESCE(SUM(${ledgerEntriesTable.credit}), 0)`,
    })
    .from(ledgerEntriesTable)
    .where(eq(ledgerEntriesTable.accountId, account.id));

  if (!result) return 0;

  const totalDebit = parseFloat(result.totalDebit);
  const totalCredit = parseFloat(result.totalCredit);

  return account.normalBalance === "debit"
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;
}

export async function getCashPosition(): Promise<CashPosition> {
  const cash = await getAccountBalance("1000");
  const bank = await getAccountBalance("1100");
  const eWallet = 0;
  const accountsReceivable = await getAccountBalance("1300");
  const accountsPayable = await getAccountBalance("2000");

  return {
    cash,
    bank,
    eWallet,
    accountsReceivable,
    accountsPayable,
    total: cash + bank + eWallet + accountsReceivable - accountsPayable,
  };
}

export async function getCashPositionItems(): Promise<CashPositionItem[]> {
  const cash = await getAccountBalance("1000");
  const bank = await getAccountBalance("1100");
  const eWallet = 0;
  const accountsReceivable = await getAccountBalance("1300");
  const accountsPayable = await getAccountBalance("2000");

  return [
    { code: "1000", name: "Kas", balance: cash },
    { code: "1100", name: "Bank", balance: bank },
    { code: "E-Wallet", name: "E-Wallet", balance: eWallet },
    { code: "1300", name: "Piutang Usaha", balance: accountsReceivable },
    { code: "2000", name: "Hutang Usaha", balance: accountsPayable },
  ];
}
