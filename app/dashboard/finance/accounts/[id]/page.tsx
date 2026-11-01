"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { LedgerResult } from "@/lib/types";
import { getLedger } from "@/lib/api/finance";
import { ApiError } from "@/lib/apiClient";

// Next.js 16: a Client Component page's dynamic segment arrives as a
// Promise — unwrapped here with React's use() hook.
export default function AccountLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [ledger, setLedger] = useState<LedgerResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getLedger(id);
        setLedger(res);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load this account's ledger.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard/finance"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Back to Finance
      </Link>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading…</div>
      ) : error ? (
        <p className="py-8 text-center text-danger">{error}</p>
      ) : ledger ? (
        <>
          <div className="mb-4 flex items-center justify-between rounded-xl bg-white p-6 shadow-sm ring-1 ring-black/5">
            <div>
              <h1 className="text-lg font-bold text-primary-navy">{ledger.account.name}</h1>
              <p className="text-xs text-gray-400">{ledger.account.code}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Balance</p>
              <p className="text-xl font-bold text-primary-navy">GHS {ledger.closingBalance.toFixed(2)}</p>
            </div>
          </div>

          {ledger.entries.length === 0 ? (
            <div className="rounded-xl bg-white py-12 text-center text-gray-400 ring-1 ring-black/5">
              No transactions recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-black/5">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium text-right">Debit</th>
                    <th className="px-4 py-3 font-medium text-right">Credit</th>
                    <th className="px-4 py-3 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.entries.map((entry, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                        {new Date(entry.date).toLocaleDateString("en-GH", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{entry.description}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {entry.debit > 0 ? entry.debit.toFixed(2) : ""}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {entry.credit > 0 ? entry.credit.toFixed(2) : ""}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-primary-navy">
                        {entry.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
