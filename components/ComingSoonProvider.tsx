"use client";

import { createContext, useContext, useState } from "react";
import { Construction } from "lucide-react";

type ComingSoonContextValue = (title: string) => void;

const ComingSoonContext = createContext<ComingSoonContextValue | null>(null);

/**
 * Lets any page or the sidebar (app/dashboard/layout.tsx) show the same
 * "this module isn't built yet" modal for whichever nav item has no real
 * page — one shared piece of UI instead of each page re-implementing it.
 */
export function ComingSoonProvider({ children }: { children: React.ReactNode }) {
  const [activeTitle, setActiveTitle] = useState<string | null>(null);

  return (
    <ComingSoonContext.Provider value={setActiveTitle}>
      {children}

      {activeTitle && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setActiveTitle(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
              <Construction size={24} />
            </span>
            <p className="mb-4 text-gray-600">
              <strong className="text-primary-navy">{activeTitle}</strong> is coming in the next
              phase of the app build.
            </p>
            <button
              onClick={() => setActiveTitle(null)}
              className="rounded-lg bg-primary-navy px-4 py-2 font-medium text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </ComingSoonContext.Provider>
  );
}

export function useComingSoon(): ComingSoonContextValue {
  const ctx = useContext(ComingSoonContext);
  if (!ctx) throw new Error("useComingSoon must be used inside <ComingSoonProvider>");
  return ctx;
}
