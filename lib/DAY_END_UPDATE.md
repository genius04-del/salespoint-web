# SalesPoint web update: Day End + Sales Mix pages

Install the backend update FIRST (this needs its new endpoints).

Extract this zip over your frontend folder (`salepoint-pos-web`). These are all NEW
files, so nothing of yours is overwritten:

    lib/dayTypes.ts
    lib/api/days.ts
    lib/api/salesMix.ts
    components/day/format.ts
    components/day/OpenDayForm.tsx
    components/day/CashUpForm.tsx
    components/day/DayDetailModal.tsx
    app/dashboard/day/page.tsx
    app/dashboard/sales-mix/page.tsx

## One manual edit: lib/navItems.ts (adds the two menu entries)

1. In the `lucide-react` import list, add two icons:

       ClipboardCheck,
       PieChart,

2. In `NAV_ITEMS`, add these two lines (for example just above the Finance line):

       { title: "Day End", icon: ClipboardCheck, permission: "day.view", href: "/dashboard/day" },
       { title: "Sales Mix", icon: PieChart, permission: "reports.view", href: "/dashboard/sales-mix" },

Then restart `npm run dev` and log out / log in once so your permissions refresh.

## How it works
- **Day End**: open the day with the cash float. During the day each cashier sees only
  THEIR OWN sales by method. The manager sees what the system expects per method and
  per cashier, taps "Count the money and close the day", types what is physically
  there, and sees the difference live. Balanced = one click to close. Not balanced =
  tick "I accept" and write a reason; the difference is posted to the books.
  Past days are listed below (click one for its report). The Owner also has the
  switch "Require an open day before selling".
- **Sales Mix**: units, revenue and profit per item, with a category breakdown, a
  search box and a Print button. From a past day's report you can jump to
  "See what sold this day".
