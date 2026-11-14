SHOP vs RESTAURANT MODE
Copy backend/ and frontend/ over your repos. No migration.

One hand edit (your dashboard home tiles, app/dashboard/page.tsx):
  1) add:   import { useIsNavHidden } from "@/lib/businessMode";
  2) inside DashboardPage(), after "const showComingSoon = useComingSoon();" add:
        const isHidden = useIsNavHidden();
  3) change the visibleItems filter to:
        const visibleItems = HOME_TILES.filter(
          (item) => !isHidden(item.title) && (item.permission === null || hasPermission(item.permission))
        );
