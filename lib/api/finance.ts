import { apiFetch } from "@/lib/apiClient";
import type { Account, AccountType, Expense, LedgerResult, NormalBalance, TrialBalance } from "@/lib/types";

// ---- Chart of Accounts ----

export function listAccounts() {
  return apiFetch<{ accounts: Account[] }>("/accounts");
}

export function seedDefaultAccounts() {
  return apiFetch<{ accounts: Account[] }>("/accounts/seed-defaults", { method: "POST" });
}

export function createAccount(input: {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
}) {
  return apiFetch<{ account: Account }>("/accounts", { method: "POST", body: input });
}

export function updateAccount(id: string, input: Partial<{ name: string; isActive: boolean }>) {
  return apiFetch<{ account: Account }>(`/accounts/${id}`, { method: "PATCH", body: input });
}

// ---- Ledger / trial balance ----

export function getTrialBalance() {
  return apiFetch<TrialBalance>("/finance/trial-balance");
}

export function getLedger(accountId: string) {
  return apiFetch<LedgerResult>(`/finance/ledger/${accountId}`);
}

// ---- Expenses ----

export function listExpenses() {
  return apiFetch<{ expenses: Expense[] }>("/expenses");
}

export function createExpense(input: {
  categoryAccountId: string;
  paymentAccountId: string;
  amount: number;
  description?: string;
  reference?: string;
}) {
  return apiFetch<{ expense: Expense }>("/expenses", { method: "POST", body: input });
}
