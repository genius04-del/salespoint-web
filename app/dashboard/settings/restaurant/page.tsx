"use client";

import { useEffect, useState } from "react";
import { getBusiness, updateBusiness } from "@/lib/api/business";
import { errMsg } from "@/components/kitchen/format";

type Flags = { restaurantModeEnabled: boolean; deductStockAtDayEnd: boolean };

export default function RestaurantSettingsPage() {
  const [flags, setFlags] = useState<Flags | null>(null);
  const [busy, setBusy] = useState<keyof Flags | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const b = (await getBusiness()).business as unknown as Flags;
        setFlags({ restaurantModeEnabled: !!b.restaurantModeEnabled, deductStockAtDayEnd: !!b.deductStockAtDayEnd });
      } catch (e) {
        setError(errMsg(e, "Could not load settings"));
      }
    })();
  }, []);

  async function toggle(key: keyof Flags) {
    if (!flags) return;
    setBusy(key);
    setError("");
    try {
      const res = (await updateBusiness({ [key]: !flags[key] } as never)).business as unknown as Flags;
      setFlags({ restaurantModeEnabled: !!res.restaurantModeEnabled, deductStockAtDayEnd: !!res.deductStockAtDayEnd });
    } catch (e) {
      setError(errMsg(e, "Could not change this. Only the owner can."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Switch
        title="Restaurant mode"
        text="Turns on tables, open tabs, the kitchen order board, kitchen recipes and the stock journal. Switch it off for a plain shop till."
        on={!!flags?.restaurantModeEnabled}
        disabled={!flags || busy !== null}
        onToggle={() => toggle("restaurantModeEnabled")}
      />
      <Switch
        title="Deduct sales from stock at day end"
        text="Selling does not touch stock. After the day closes, a manager deducts the day's sales from stock using the recipes. That gives the stock that should be left, to compare with the count. Use this when menu items such as pizzas are made to order and not kept as finished stock."
        on={!!flags?.deductStockAtDayEnd}
        disabled={!flags || busy !== null}
        onToggle={() => toggle("deductStockAtDayEnd")}
      />
    </div>
  );
}

function Switch({ title, text, on, disabled, onToggle }: { title: string; text: string; on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-[#071A2F]">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{text}</p>
        </div>
        <button
          role="switch"
          aria-checked={on}
          disabled={disabled}
          onClick={onToggle}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${on ? "bg-[#FF6B00]" : "bg-gray-300"} disabled:opacity-50`}
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
        </button>
      </div>
    </div>
  );
}
