"use client";

import { useMemo } from "react";
import { computeAllocations, type Curve, type Player } from "@/lib/distribute";

const CURVES: Array<{ key: Curve; label: string; accent: string }> = [
  { key: "linear", label: "Linear", accent: "bg-rose-400/70" },
  { key: "quadratic", label: "Quadratic", accent: "bg-emerald-400/70" },
  { key: "equal", label: "Equal", accent: "bg-sky-400/70" },
];

export function CurveCompare({
  players,
  percentile,
  excludeBelowStart,
  startingPoints,
  poolWei,
  gasDripPerWinnerWei,
  selected,
}: {
  players: Player[];
  percentile: number;
  excludeBelowStart: boolean;
  startingPoints: number;
  poolWei: bigint;
  gasDripPerWinnerWei: bigint;
  selected: Curve;
}) {
  const rows = useMemo(() => {
    return CURVES.map((c) => {
      const result = computeAllocations(players, {
        percentile,
        curve: c.key,
        excludeBelowStart,
        startingPoints,
        poolWei,
        gasDripPerWinnerWei,
      });
      const total = result.winners.reduce((a, b) => a + b.amountWei, 0n);
      const top1 = result.winners[0]?.share ?? 0;
      const top3 = result.winners
        .slice(0, 3)
        .reduce((a, b) => a + b.share, 0);
      const sharesTop5 = result.winners.slice(0, 5).map((w) => w.share);
      return { ...c, sharesTop5, top1, top3, total, winnersCount: result.winners.length };
    });
  }, [players, percentile, excludeBelowStart, startingPoints, poolWei, gasDripPerWinnerWei]);

  const allMax = Math.max(...rows.flatMap((r) => r.sharesTop5), 0.0001);

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/40">
          Curve comparison — top 5
        </div>
        <div className="text-[10px] text-white/30">selected: {selected}</div>
      </div>
      <div className="flex flex-col gap-2.5">
        {rows.map((r) => {
          const isSelected = r.key === selected;
          return (
            <div
              key={r.key}
              className={`rounded-xl p-2.5 ${
                isSelected
                  ? "bg-white/[0.04] ring-1 ring-brand-500/50"
                  : "bg-white/[0.015]"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={`text-xs font-bold ${
                    isSelected ? "text-white" : "text-white/60"
                  }`}
                >
                  {r.label}
                </span>
                <span className="text-[10px] text-white/40 tabular-nums">
                  top1 {(r.top1 * 100).toFixed(0)}% · top3 {(r.top3 * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-end gap-1 h-12">
                {r.sharesTop5.map((s, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-md transition-all duration-500 ${r.accent}`}
                    style={{
                      height: `${Math.max(6, (s / allMax) * 100)}%`,
                      opacity: isSelected ? 1 : 0.55,
                    }}
                    title={`#${i + 1}: ${(s * 100).toFixed(1)}%`}
                  />
                ))}
                {/* pad empty slots */}
                {Array.from({ length: 5 - r.sharesTop5.length }).map((_, i) => (
                  <div key={`pad-${i}`} className="flex-1" />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-white/40 leading-relaxed">
        Quadratic compresses the gap between #1 and #N by weighting payouts by √points.
        Linear is winner-take-most; Equal flattens everything.
      </p>
    </div>
  );
}
