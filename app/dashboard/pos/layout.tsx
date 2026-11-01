import { ShiftGate } from "@/components/shift/ShiftGate";

// Keeps the POS locked behind a PIN until the cashier's shift is open.
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <ShiftGate>{children}</ShiftGate>;
}
