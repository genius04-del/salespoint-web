# SalesPoint POS — Web Frontend (Phase 4 + multi-tenant Paystack)

Next.js frontend for SalesPoint, replacing the earlier Flutter attempt —
see the chat for why. Phase 1: auth/business onboarding/dashboard shell. Phase 2: Products/
Categories/Inventory. Phase 3: POS/checkout, sidebar navigation, footer.
This phase adds Customers, Suppliers, and Purchases. Every other module
(Sales history, Finance, Reports, etc.) is still a placeholder, built in
the phases that follow.

## This one WAS actually built and verified

Unlike the Flutter attempt, this sandbox has both Node.js and access to
npm's registry, so this project was genuinely scaffolded with
`create-next-app`, had real dependencies installed, and was **actually
compiled**:
- `npx tsc --noEmit` — clean, zero errors
- `npm run build` — a real production build, succeeded, all 8 routes compiled
- `npx eslint .` — zero warnings

The one thing that couldn't be verified here is visual/runtime behavior
in an actual browser (no browser in this sandbox) — `npm run dev` on your
machine is the first time you'll actually see it render.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` — the defaults already point
   at `http://localhost:4000`, matching your backend's default port.
3. Make sure your backend is running (`npm run dev` in the backend folder).
4. `npm run dev` — opens on `http://localhost:3000`.
5. Log in with the same account you've been testing the backend with, or
   click "Create one" to register a fresh business.

### CORS note

Business-data calls (products, sales, etc.) go straight from the browser
to your backend at `NEXT_PUBLIC_API_BASE_URL`. In development, with
`ALLOWED_ORIGINS` unset on the backend, everything is allowed — so this
works out of the box. Once you deploy both for real, add this frontend's
real URL to the backend's `ALLOWED_ORIGINS`.

## Architecture

- **Next.js 16, App Router, TypeScript, Tailwind CSS v4.** Tailwind v4
  reads its theme from a CSS `@theme` block in `app/globals.css` instead
  of a `tailwind.config.ts` file — the brand colors (navy/orange, per the
  spec's section 30) live there.
- **Auth tokens split across two places, deliberately:**
  - The **refresh token** lives in an **httpOnly cookie**, set by the
    `/api/auth/*` Route Handlers (`app/api/auth/login|register|refresh|logout/route.ts`).
    Client-side JavaScript can never read it — even an XSS payload running
    on the page can't steal it.
  - The **access token** lives only in memory (`lib/apiClient.ts`,
    `accessToken` module variable) — never localStorage, never a readable
    cookie. A hard page refresh loses it, and `AuthContext` silently
    restores it via `POST /api/auth/refresh` (which reads the httpOnly
    cookie) on every app load.
  - This is the standard "BFF" (backend-for-frontend) pattern for a
    Next.js app talking to an external API — meaningfully more secure
    than the common localStorage-token approach, at the cost of this one
    extra layer of Route Handlers.
- **`lib/apiClient.ts`** — every business-data call (once later phases add
  them) goes through `apiFetch()`, which attaches the access token and,
  on a 401, transparently refreshes it once and retries — with a
  single-flight guard so several requests failing at once only trigger
  one refresh call, not five.
- **`contexts/AuthContext.tsx`** — the single source of truth for
  `status` / `user` / `permissions` across the app, mirroring the
  Flutter version's `AuthProvider` one-for-one in what it does.
- **`proxy.ts`** (Next.js 16 renamed `middleware.ts` to this — see
  `node_modules/next/dist/docs` if anything here looks unfamiliar from
  older Next.js knowledge) — a fast, shallow gate that redirects based on
  whether the refresh cookie is merely *present*, not whether it's valid.
  The real check is always `AuthContext`'s `/api/auth/refresh` call.
- **`app/dashboard/page.tsx`** — the module grid mirrors the spec's main
  navigation list (section 31); each tile only shows if
  `AuthContext.permissions` (from `/auth/me`) includes that module's
  permission. This is a convenience, not a security boundary — the
  backend enforces the real one on every call regardless of what this
  page shows or hides.


## Phase 2 — Products, Categories, Inventory

- **`app/dashboard/products/page.tsx`** — searchable, filterable product
  list (debounced search, category filter), low-stock badge per row,
  edit/remove actions. Removing a product mirrors the backend exactly: it
  tries a real delete, and if the product has any inventory history the
  backend deactivates it instead — the UI just shows whichever happened.
- **`app/dashboard/products/new/page.tsx`** / **`[id]/page.tsx`** — create
  and edit, sharing one form component (`components/ProductForm.tsx`).
  Opening stock is only ever set at creation — editing a product
  deliberately has no quantity field, since stock changes must always go
  through a traceable inventory movement, never a silent overwrite.
- **`components/CategoryManagerModal.tsx`** — add/rename/remove
  categories inline, reachable from the Products page's header.
- **`app/dashboard/inventory/page.tsx`** — a low-stock banner, the
  movement history table (color-coded by type, +/- indicators), and
  **`components/RecordAdjustmentModal.tsx`** for manually recording
  ADJUSTMENT / DAMAGE / RETURN / OPENING_STOCK / TRANSFER movements —
  PURCHASE and SALE are deliberately not offered here, since the backend
  only ever creates those automatically (Purchases/POS modules, built in
  later phases).
- **`lib/api/products.ts`** and **`lib/api/inventory.ts`** — typed
  wrappers around every endpoint this phase uses, all going through the
  shared `apiFetch()` from Phase 1 (token attach + transparent 401 refresh).
- **Icons switched from emoji to `lucide-react`** across the whole app
  (dashboard tiles, login/register, logout button) — a proper icon set
  reads as more polished than relying on how each OS happens to render emoji.

### A real bug found and fixed during this phase

The refresh-token cookie was scoped to `path: "/api/auth"`, which meant
`proxy.ts` — which needs to see that cookie on *every* page to decide
where to route you — never actually received it outside the auth API
routes themselves. The practical symptom: login would succeed, but the
app would silently bounce back to `/login` instead of reaching the
dashboard. Fixed in `lib/authCookie.ts` by scoping the cookie to `path: "/"` instead.

### A genuinely new lint rule worth knowing about

`react-hooks/set-state-in-effect` (part of this project's newer
`eslint-config-next`) flags a `useEffect` that **synchronously** calls a
`useCallback`-memoized function known to call a state setter — even
though an equivalent `setTimeout`-deferred call a few lines away in the
same file does NOT get flagged. The fix used throughout this phase:
wrap the call in an inline async IIFE rather than calling the reference
directly — see the comments in `app/dashboard/products/page.tsx` and
`app/dashboard/inventory/page.tsx` for a worked example, matching the
pattern `contexts/AuthContext.tsx` already used in Phase 1.


## Phase 3 — POS/Checkout, sidebar navigation, footer

- **`app/dashboard/pos/page.tsx`** — the actual point-of-sale screen: a
  product grid (search + category filter, tap to add) on the left, a
  sticky cart panel on the right. Quantity controls are clamped to each
  product's live stock count client-side, so you can't add more than
  what's on hand — the backend's own stock check is still the real
  enforcement, this is just immediate feedback.
  - Optional walk-in-or-existing-customer selection, a payment method
    picker, and a Cash-only "amount tendered" field with live change
    calculation.
  - **Paystack is deliberately not offered here** — same reasoning as the
    backend had before its Phase 5: a card payment needs the separate
    initialize → webhook → verify flow, not a same-request charge. Only
    Cash, Mobile Money, Bank Transfer, and Other are offered; wiring in
    Paystack checkout is a later phase.
  - On success, **`components/ReceiptModal.tsx`** shows a printable
    receipt (business name/address from `GET /business`, line items,
    totals, change) with a working Print button (`window.print()`, with
    print-specific CSS hiding the buttons/backdrop).
- **Sidebar navigation** (`components/Sidebar.tsx`) replaces the old
  tile-only home screen as the primary way to move around — a fixed
  left sidebar from the `sm` breakpoint up, and a slide-in drawer (toggled
  by a hamburger button) below it. The nav list itself
  (`lib/navItems.ts`) is now the single shared source for both the
  sidebar and the dashboard home grid, so they can't drift out of sync.
  Every item still only appears if `AuthContext.permissions` allows it.
- **`components/ComingSoonProvider.tsx`** — a small React Context so
  *any* page (not just the dashboard home grid) can show the "this isn't
  built yet" modal for a nav item with no real page — the sidebar uses
  it too now.
- **Footer**: "SalesPoint by GoDigital Technologies" — in the sidebar
  (desktop/drawer) and as a page footer, per request.
- **`lib/api/sales.ts`**, **`lib/api/customers.ts`**, **`lib/api/business.ts`** —
  typed wrappers for the three new endpoints this phase needed.


## Phase 4 — Customers, Suppliers, Purchases

- **`app/dashboard/customers/page.tsx`** — searchable list, add/edit via
  `components/CustomerFormModal.tsx`, and a detail view
  (`components/CustomerDetailModal.tsx`) showing each customer's purchase
  history. Deleting only succeeds if the customer has no sales on record
  (mirrors the backend exactly) — the error message explains why rather
  than failing silently.
- **`app/dashboard/suppliers/page.tsx`** — same list/add/edit/detail
  pattern, plus each row shows **outstanding balance** when nonzero
  (computed by the backend from real purchase records, never a stored
  number that could drift).
- **`app/dashboard/purchases/page.tsx`** — list filterable by supplier,
  color-coded by payment status (UNPAID/PARTIAL/PAID).
- **`app/dashboard/purchases/new/page.tsx`** — record a purchase: pick a
  supplier, add item rows (product + quantity + cost price, defaulting
  to the product's current cost but editable per purchase), an optional
  amount-paid-now field, and notes. This is the one screen in this phase
  with a genuinely dynamic form (add/remove item rows) rather than a
  simple modal.
- **`app/dashboard/purchases/[id]/page.tsx`** — purchase detail: items,
  running total/paid/outstanding, and the payment history, with
  **`components/RecordPurchasePaymentModal.tsx`** to record a payment
  against the remaining balance (capped client-side at the outstanding
  amount, same cap the backend itself enforces).
- All three modules are now wired into the sidebar (`lib/navItems.ts`),
  replacing their "coming soon" placeholders.


## Post-Phase-4 — Multi-tenant Paystack

Matches the backend's own switch from one shared Paystack account to one
per business — see the backend README for the full reasoning (the
webhook-signature chicken-and-egg problem, encryption at rest, etc.).
This is the frontend half:

- **`app/dashboard/settings/paystack/page.tsx`** — Owner-only. Shows
  connection status (never the secret key — it's write-only, same as a
  password), and a form to connect/replace keys. Explains in plain
  language where to get Paystack keys and to use Test keys while trying
  this out. The secret key input is cleared from state immediately after
  a successful save, so it doesn't linger in memory longer than it has to.
- **`app/dashboard/pos/page.tsx`** — the Paystack payment-method button is
  now disabled (with an explanatory tooltip and a link straight to
  Settings) until `business.paystackConfigured` is true — so a cashier
  can't even attempt a Paystack charge that the backend would just reject.
  Selecting Paystack swaps the amount-tendered field for a required
  customer-email field (Paystack needs one to open its payment page).
- **`components/PaystackCheckoutModal.tsx`** — opens Paystack's hosted
  checkout in a new tab, then polls `GET /payments/paystack/:reference/status`
  every few seconds. That status call itself triggers real verification
  against Paystack on the backend if still pending — this UI is never the
  source of truth, just a window onto it. Auto-polling gives up after
  about two minutes and switches to a manual "Check Now" button, since a
  slow customer shouldn't be treated as a failure. A direct "Open payment
  page" link/button is always shown too, in case the new-tab popup got
  blocked.
- If the backend flags `reconciliationNeeded` (payment succeeded but
  stock ran out in the meantime — see the backend's own handling of
  this), the receipt shows a visible warning banner instead of silently
  treating it as a normal sale.
- **`lib/types.ts`**'s `Business` type gained `paystackConfigured` and
  `paystackPublicKey` to match the backend's now-explicit field selection.

## Known gaps

- **Font**: using a system-font stack for now (looks very close to
  Inter), not Inter itself — this sandbox has no network access to
  Google Fonts to verify a build using `next/font/google`. To switch to
  real Inter: either confirm `next/font/google` works for you (just
  revert `app/layout.tsx` and `app/globals.css`'s `--font-sans` — ask me
  and I'll do it), or self-host it with `next/font/local` for a build
  that has zero external dependencies at all (the more production-safe
  option, same tradeoff noted for the Flutter attempt's `google_fonts`
  package).
- No "change password" or full password-reset screen yet — only the
  forgot-password *request* dialog on the login page. The backend's
  `/auth/change-password` and `/auth/reset-password` endpoints exist and
  work; the screens for them are a short follow-up whenever you want them.

## Next phases (mirroring the backend's own order)

Paystack payments, Finance, Reports, Staff, and Restaurant/Kitchen mode
— each one replacing a "coming soon" nav item with a real page. A
dedicated Sales-history page (list/filter/cancel past sales) is also
still outstanding.
