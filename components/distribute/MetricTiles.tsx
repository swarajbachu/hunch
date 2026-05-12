"use client";

import { formatEther } from "viem";
import type { Allocation } from "@/lib/distribute";

export function MetricTiles({
  poolWei,
  allocations,
  distributableWei,
  curve,
}: {
  poolWei: bigint;
  allocations: Allocation[];
  distributableWei: bigint;
  curve: "linear" | "quadratic" | "equal";
}) {
  const winners = allocations.length;
  const top1Share = allocations[0]?.share ?? 0;
  const top3Share = allocations.slice(0, 3).reduce((a, b) => a + b.share, 0);
  const avg =
    winners > 0
      ? Number(formatEther(distributableWei)) / winners
      : 0;
  const gini = computeGini(allocations.map((a) => Number(a.amountWei)));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <Tile
        label="Pool"
        value={`${Number(formatEther(poolWei)).toFixed(3)}`}
        unit="MON"
        accent="emerald"
      />
      <Tile
        label="Winners"
        value={winners.toString()}
        unit={curve}
        accent="brand"
      />
      <Tile
        label="Top 3 take"
        value={`${(top3Share * 100).toFixed(0)}%`}
        unit={`#1: ${(top1Share * 100).toFixed(0)}%`}
        accent="amber"
      />
      <Tile
        label="Avg payout"
        value={avg.toFixed(4)}
        unit={`gini ${gini.toFixed(2)}`}
        accent="sky"
      />
    </div>
  );
}

function Tile({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit?: string;
  accent: "emerald" | "brand" | "amber" | "sky";
}) {
  const accentMap = {
    emerald: "from-emerald-500/15 to-emerald-500/0 border-emerald-400/20",
    brand: "from-brand-500/15 to-brand-500/0 border-brand-500/20",
    amber: "from-amber-500/15 to-amber-500/0 border-amber-400/20",
    sky: "from-sky-500/15 to-sky-500/0 border-sky-400/20",
  };
  return (
    <div
      className={`rounded-xl p-3 border bg-gradient-to-br ${accentMap[accent]}`}
    >
      <div className="text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </div>
      <div className="text-2xl font-black tabular-nums leading-tight">{value}</div>
      {unit && (
        <div className="text-[10px] text-white/50 mt-0.5 truncate">{unit}</div>
      )}
    </div>
  );
}

// Gini coefficient — 0 = perfect equality, 1 = perfect inequality.
function computeGini(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let cumulative = 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) {
    cumulative += sorted[i];
    weighted += cumulative;
  }
  return (n + 1 - (2 * weighted) / total) / n;
}
