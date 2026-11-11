"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleHelp, X, Search, ChevronDown, ArrowRight } from "lucide-react";
import { HELP_ENTRIES, SUGGESTED_QUESTIONS, type HelpAudience } from "@/lib/help/content";
import { buildIndex, searchHelp } from "@/lib/help/search";

// A search-style help bubble: type a question, get the matching steps from the
// manual. No server and no cost; the answers live in lib/help/content.ts.
// `audience="cashier"` (used on the till) shows only cashier-relevant answers.
export function HelpBot({ audience }: { audience?: HelpAudience }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const index = useMemo(() => buildIndex(HELP_ENTRIES), []);
  const results = useMemo(() => searchHelp(index, query, audience), [index, query, audience]);
  const asked = query.trim().length > 0;
  // The best match is shown open unless the person chose another one.
  const expanded = openId ?? results[0]?.entry.id ?? null;

  const suggestions = SUGGESTED_QUESTIONS;

  return (
    <div className="print:hidden">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-brand-orange px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-light-orange"
          aria-label="Open help"
        >
          <CircleHelp size={18} />
          Help
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Help"
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[24rem]"
        >
          <div className="flex items-center justify-between bg-primary-navy px-4 py-3 text-white">
            <div className="flex items-center gap-2 font-semibold">
              <CircleHelp size={18} />
              How can we help?
            </div>
            <button onClick={() => setOpen(false)} className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Close help">
              <X size={18} />
            </button>
          </div>

          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOpenId(null);
                }}
                placeholder="Ask in your own words, e.g. how do I cash up?"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!asked && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Try asking</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setQuery(s);
                        setOpenId(null);
                      }}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:border-brand-orange hover:text-brand-orange"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {asked && results.length === 0 && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-700">I could not find that.</p>
                <p className="mt-1">Try different words, like &quot;cash up&quot;, &quot;PIN&quot; or &quot;add ingredient&quot;. If it is still not clear, contact LoneWolf Digital Technology Solutions.</p>
              </div>
            )}

            {asked && results.length > 0 && (
              <ul className="space-y-2">
                {results.map(({ entry }) => {
                  const isOpen = expanded === entry.id;
                  return (
                    <li key={entry.id} className="rounded-lg border border-gray-200">
                      <button
                        onClick={() => setOpenId(isOpen ? "" : entry.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-medium text-primary-navy"
                        aria-expanded={isOpen}
                      >
                        {entry.title}
                        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition ${isOpen ? "rotate-180" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 px-3 py-3 text-sm text-gray-700">
                          <p>{entry.answer}</p>
                          {entry.steps && (
                            <ol className="mt-2 list-decimal space-y-1 pl-5">
                              {entry.steps.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ol>
                          )}
                          {entry.href && (
                            <Link
                              href={entry.href}
                              onClick={() => setOpen(false)}
                              className="mt-3 inline-flex items-center gap-1 font-semibold text-brand-orange hover:underline"
                            >
                              {entry.hrefLabel ?? "Open page"}
                              <ArrowRight size={14} />
                            </Link>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
