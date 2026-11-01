# Finance module — files to add/replace

Drop these into your existing `salepoint-pos-web` project at the same
paths. All were verified with a real `tsc`, `eslint`, and `npm run build`
in a rebuilt sandbox copy — see the chat for why that rebuild was needed.

## New files
- `lib/api/finance.ts`
- `components/ExpenseFormModal.tsx`
- `app/dashboard/finance/page.tsx`
- `app/dashboard/finance/accounts/[id]/page.tsx`

## Files to fully replace
- `lib/types.ts` — now includes `Account`, `TrialBalance`, `LedgerResult`,
  `Expense`, etc. alongside everything from earlier phases.
- `lib/navItems.ts` — the Finance entry now has `href: "/dashboard/finance"`,
  so it's a real link instead of the "coming soon" placeholder.

## What it does
- `GET /accounts`, `GET /finance/trial-balance`, `GET /expenses` all load
  together on `/dashboard/finance`.
- If the business has no chart of accounts yet, the Owner sees a
  "Set Up Default Accounts" button (calls `POST /accounts/seed-defaults`) —
  matches the same one-time backfill you used on the backend for your
  test business.
- A balanced/out-of-balance banner reflects `trialBalance.balanced`
  directly from the backend — this page never computes that itself.
- Clicking an account opens its ledger
  (`app/dashboard/finance/accounts/[id]/page.tsx`) — chronological entries
  with a running balance, exactly as the backend returns them.
- "Record Expense" picks the category from EXPENSE-type accounts and the
  payment source from ASSET-type accounts (Cash, Bank, Mobile Money,
  Paystack Clearing, etc.) — the same split the backend's double-entry
  posting expects.

## One thing worth checking on your end

While rebuilding my own sandbox copy of this project from scratch, a
*brand-new* Next.js version (16.4.0, newer than the one your project was
created with) turned on a feature called **Cache Components** by default,
which broke the build for this app's architecture (every page here is a
Client Component fetching its own data — that feature targets server-side
fetch caching, which this project doesn't use).

**Check your own `next.config.ts`.** If it does NOT have a `cacheComponents: true`
line, you're fine — your project is still on the older Next.js version and
unaffected, ignore this. If it DOES have that line (e.g. after a future
`npm install` upgrades Next.js), remove it:

```ts
const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    rules: {
      "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" },
    },
  },
};
```
(just delete the `cacheComponents: true` and `partialPrefetching: true` lines if present)
