import { ShiftGate } from "@/components/shift/ShiftGate";

// Tabs take cash too, so the Tables screen sits behind the same shift lock.
export default function TablesLayout({ children }: { children: React.ReactNode }) {
  return <ShiftGate>{children}</ShiftGate>;
}
