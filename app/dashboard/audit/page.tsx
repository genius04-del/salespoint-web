 "use client";

import { Fragment, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { listAuditActions, listAuditLogs } from "@/lib/api/auditLogs";
import type { AuditLogResponse } from "@/lib/types";

const PAGE_SIZE = 50;

function pretty(action: string) {
  return action.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [actions, setActions] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { actions } = await listAuditActions();
        if (!cancelled) setActions(actions);
      } catch {
        /* the filter dropdown is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await listAuditLogs({
          action: action || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: PAGE_SIZE,
        });
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load audit log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [action, from, to, page]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const field =
    "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#FF6B00]";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#071A2F]">Audit Log</h1>
          <p className="text-sm text-gray-500">
            Who did what, and when. Records can&apos;t be edited or deleted.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            className={field}
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {pretty(a)}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className={field}
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className={field}
            aria-label="To date"
          />
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && data?.logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No activity found.
                </td>
              </tr>
            )}
            {!loading &&
              data?.logs.map((l) => {
                const hasDetails = l.metadata && Object.keys(l.metadata).length > 0;
                return (
                  <Fragment key={l.id}>
                    <tr
                      onClick={() => hasDetails && setOpenId(openId === l.id ? null : l.id)}
                      className={hasDetails ? "cursor-pointer hover:bg-gray-50" : ""}
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {new Date(l.createdAt).toLocaleString("en-GH")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#071A2F]">{l.user?.name ?? "System"}</p>
                        {l.user && (
                          <p className="text-xs text-gray-400">{l.user.role.replace(/_/g, " ")}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-[#071A2F]/5 px-2.5 py-0.5 text-xs font-medium text-[#071A2F]">
                          {pretty(l.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {l.entity}
                        {hasDetails && <span className="ml-2 text-xs text-[#FF6B00]">details</span>}
                      </td>
                    </tr>
                    {openId === l.id && hasDetails && (
                      <tr>
                        <td colSpan={4} className="bg-gray-50 px-4 py-3">
                          <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-gray-700">
                            {JSON.stringify(l.metadata, null, 2)}
                          </pre>
                          {l.entityId && (
                            <p className="mt-1 text-xs text-gray-400">Record ID: {l.entityId}</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
          </tbody>
        </table>
      </div>

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} · {data.total} entries
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-gray-200 bg-white p-2 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-gray-200 bg-white p-2 disabled:opacity-40"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}