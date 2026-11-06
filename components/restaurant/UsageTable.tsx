import type { UsageLine } from "@/lib/api/stockDeduction";

const num = (n: number) => n.toLocaleString("en-GH", { maximumFractionDigits: 3 });

export function UsageTable({ lines }: { lines: UsageLine[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-100 text-xs uppercase text-gray-500">
          <tr><th className="py-2">Item</th><th className="py-2 text-right">Used by sales</th><th className="py-2 text-right">In stock now</th><th className="py-2 text-right">Should be left</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {lines.map((l) => (
            <tr key={`${l.kind}${l.id}`}>
              <td className="py-2">
                <p className="font-medium text-[#071A2F]">{l.name}</p>
                {l.soldAs && l.soldAs.length > 0 && <p className="text-xs text-gray-400">{l.soldAs.join(", ")}</p>}
              </td>
              <td className="py-2 text-right">{num(l.quantity)} {l.unit}</td>
              <td className="py-2 text-right text-gray-500">{num(l.before)} {l.unit}</td>
              <td className={`py-2 text-right font-semibold ${l.after < 0 ? "text-red-600" : "text-[#071A2F]"}`}>{num(l.after)} {l.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
