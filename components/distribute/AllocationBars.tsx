"use client";

import { formatEther } from "viem";
import type { Allocation } from "@/lib/distribute";

const MEDAL_COLORS = ["from-yellow-400 to-amber-500", "from-zinc-300 to-zinc-400", "from-amber-700 to-amber-800"];

export function AllocationBars({ allocations }: { allocations: Allocation[] }) {
  if (allocations.length === 0) {
    return (
      <div className="p-6 text-center text-white/40 text-sm">
        No eligible winners with current settings.
      </div>
    );
  }

  const maxShare = allocations[0]?.share ?? 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-2 max-h-72 overflow-y-auto">
      <ol className="flex flex-col gap-1">
        {allocations.map((a, i) => {
          const widthPct = maxShare > 0 ? (a.share / maxShare) * 100 : 0;
          const medal = MEDAL_COLORS[i];
          return (
            <li key={a.address} className="relative px-3 py-2 rounded-xl group">
              <div className="absolute inset-0 rounded-xl overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                    medal
                      ? `bg-gradient-to-r ${medal} opacity-25`
                      : "bg-gradient-to-r from-brand-500/40 to-brand-500/10"
                  }`}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <div className="relative flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-6 text-center font-black tabular-nums ${
                      i === 0
                        ? "text-yellow-300"
                        : i === 1
                        ? "text-zinc-200"
                        : i === 2
                        ? "text-amber-500"
                        : "text-white/40"
                    }`}
                  >
                    {a.rank}
                  </span>
                  <span className="truncate font-semibold">{a.displayName}</span>
                  <span className="text-[10px] text-white/40 tabular-nums shrink-0">
                    {a.points} pts
                  </span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-white/50 tabular-nums">
                    {(a.share * 100).toFixed(1)}%
                  </span>
                  <span className="font-mono font-black tabular-nums">
                    {Number(formatEther(a.amountWei)).toFixed(4)}
                  </span>
                  <span className="text-[10px] text-white/40">MON</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
