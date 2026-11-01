"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Landmark, CircleCheck, TriangleAlert, Receipt } from "lucide-react";
import type { Account, Expense, TrialBalance } from "@/lib/types";
import { listAccounts, getTrialBalance, seedDefaultAccounts, listExpenses } from "@/lib/api/finance";
import { ApiError } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { ExpenseFormModal } from "@/components/ExpenseFormModal";

export default function FinancePage() {
  const { user } = useAuth();
  const isOwner = user?.role === "OWNER";

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trialBalance, setTrialBalance] = useState<TrialBalance | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [accountsRes, trialBalanceRes, expensesRes] = await Promise.all([
        listAccounts(),
        getTrialBalance(),
        listExpenses(),
      ]);
      setAccounts(accountsRes.accounts);
      setTrialBalance(trialBalanceRes);
      setExpenses(expensesRes.expenses);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load finance data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadAll();
    })();
  }, [loadAll]);

  async function handleSeed() {
    setIsSeeding(true);
    setError(null);
    try {
      await seedDefaultAccounts();
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not set up the chart of accounts.");
    } finally {
      setIsSeeding(false);
    }
  }

  const accountsWithActivity = trialBalance?.accounts.filter((a) => a.debit !== 0 || a.credit !== 0) ?? [];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-primary-navy">Finance</h1>
        {accounts.length > 0 && (
          <button
            onClick={() => setShowExpenseModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-semibold text-white hover:bg-light-orange"
          >
            <Plus size={16} />
            Record Expense
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</div>}

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white py-16 text-center ring-1 ring-black/5">
          <Landmark size={32} className="text-gray-300" />
          <p className="text-gray-500">No chart of accounts set up yet.</p>
          {isOwner ? (
            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-light-orange disabled:opacity-60"
            >
              {isSeeding ? "Setting up…" : "Set Up Default Accounts"}
            </button>
          ) : (
            <p className="text-sm text-gray-400">Ask the business owner to set this up.</p>
          )}
        </div>
      ) : (
        <>
          {trialBalance && (
            <div
              className={`mb-5 flex items-center gap-3 rounded-xl p-4 ring-1 ${
                trialBalance.balanced ? "bg-success/5 ring-success/20" : "bg-danger/5 ring-danger/20"
              }`}
            >
              {trialBalance.balanced ? (
                <CircleCheck size={22} className="shrink-0 text-success" />
              ) : (
                <TriangleAlert size={22} className="shrink-0 text-danger" />
              )}
              <div>
                <p className={`font-semibold ${trialBalance.balanced ? "text-success" : "text-danger"}`}>
                  {trialBalance.balanced ? "Books are balanced" : "Books are out of balance"}
                </p>
                <p className="text-xs text-gray-500">
                  Total debits GHS {trialBalance.totalDebits.toFixed(2)} · Total credits GHS{" "}
                  {trialBalance.totalCredits.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          <h2 className="mb-3 font-semibold text-primary-navy">Accounts</h2>
          <div className="mb-6 overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
            <ul className="divide-y divide-gray-50">
              {(accountsWithActivity.length > 0 ? accountsWithActivity : trialBalance?.accounts ?? []).map(
                (row) => {
                  const account = accounts.find((a) => a.code === row.code);
                  const balance = row.debit > 0 ? row.debit : row.credit;
                  return (
                    <li key={row.code}>
                      <Link
                        href={account ? `/dashboard/finance/accounts/${account.id}` : "#"}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-app-background"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-primary-navy">{row.name}</p>
                          <p className="text-xs text-gray-400">
                            {row.code} · {row.type}
                          </p>
                        </div>
                        <p className="font-medium text-gray-700">GHS {balance.toFixed(2)}</p>
                      </Link>
                    </li>
                  );
                }
              )}
            </ul>
          </div>

          <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-primary-navy">
            <Receipt size={18} />
            Recent Expenses
          </h2>
          {expenses.length === 0 ? (
            <div className="rounded-xl bg-white py-10 text-center text-gray-400 ring-1 ring-black/5">
              No expenses recorded yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              <ul className="divide-y divide-gray-50">
                {expenses.map((expense) => (
                  <li key={expense.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-primary-navy">
                        {expense.categoryAccount?.name ?? "Expense"}
                      </p>
                      <p className="truncate text-xs text-gray-400">
                        {expense.description || "No description"} ·{" "}
                        {new Date(expense.createdAt).toLocaleDateString("en-GH", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <p className="font-medium text-danger">GHS {Number(expense.amount).toFixed(2)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {showExpenseModal && (
        <ExpenseFormModal accounts={accounts} onClose={() => setShowExpenseModal(false)} onSaved={loadAll} />
      )}
    </div>
  );
}

