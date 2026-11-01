import type { StockCountStatus } from "@/lib/stockTypes";

const STYLES: Record<StockCountStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-50 text-blue-700",
  APPROVED: "bg-green-50 text-green-700",
  REJECTED: "bg-amber-50 text-amber-700",
};
const LABELS: Record<StockCountStatus, string> = {
  DRAFT: "In progress",
  SUBMITTED: "Waiting for approval",
  APPROVED: "Approved",
  REJECTED: "Sent back",
};

export function StatusBadge({ status }: { status: StockCountStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}>{LABELS[status]}</span>;
}
