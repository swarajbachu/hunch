"use client";

import type { Allocation } from "@/lib/distribute";

// Draws y = sqrt(x) over the winners' point range, with dots marking each
// winner's position. Visualizes why quadratic compresses the top of the
// distribution.
export function SqrtCurve({
  allocations,
  curve,
}: {
  allocations: Allocation[];
  curve: "linear" | "quadratic" | "equal";
}) {
  const w = 480;
  const h = 140;
  const pad = 16;
  const innerW = w - pad * 2;
  const innerH = h - pad * 2;

  if (allocations.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-white/40 text-sm text-center">
        Allocations will visualize here once there are eligible winners.
      </div>
    );
  }

  const maxPoints = Math.max(...allocations.map((a) => a.points), 1);
  const transform = (pts: number) => {
    if (curve === "linear") return pts / maxPoints;
    if (curve === "equal") return 1;
    return Math.sqrt(pts) / Math.sqrt(maxPoints);
  };
  const maxY = transform(maxPoints);

  // Generate the curve path
  const points: string[] = [];
  for (let i = 0; i <= 60; i++) {
    const t = i / 60;
    const pts = t * maxPoints;
    const y = transform(pts) / maxY;
    const px = pad + t * innerW;
    const py = pad + innerH - y * innerH;
    points.push(`${i === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-brand-500/[0.06] via-transparent to-emerald-500/[0.04] p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-white/40">
          Weight function
        </div>
        <div className="text-[10px] font-mono text-emerald-300">
          {curve === "quadratic"
            ? "weight = √points"
            : curve === "linear"
            ? "weight = points"
            : "weight = 1"}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <defs>
          <linearGradient id="curveGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(16,185,129)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(16,185,129)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* axes */}
        <line
          x1={pad}
          y1={pad + innerH}
          x2={pad + innerW}
          y2={pad + innerH}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={pad + innerH}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="1"
        />

        {/* curve fill */}
        <path
          d={`${points.join(" ")} L ${pad + innerW} ${pad + innerH} L ${pad} ${pad + innerH} Z`}
          fill="url(#curveGrad)"
        />
        {/* curve stroke */}
        <path
          d={points.join(" ")}
          fill="none"
          stroke="rgb(16,185,129)"
          strokeWidth="2"
        />

        {/* winner dots */}
        {allocations.slice(0, 12).map((a, i) => {
          const x = pad + (a.points / maxPoints) * innerW;
          const yVal = transform(a.points) / maxY;
          const y = pad + innerH - yVal * innerH;
          const isTop3 = i < 3;
          return (
            <g key={a.address}>
              <line
                x1={x}
                y1={y}
                x2={x}
                y2={pad + innerH}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="2 3"
              />
              <circle
                cx={x}
                cy={y}
                r={isTop3 ? 5 : 3.5}
                fill={
                  i === 0
                    ? "#FCD34D"
                    : i === 1
                    ? "#E4E4E7"
                    : i === 2
                    ? "#D97706"
                    : "rgb(124,58,237)"
                }
                stroke="rgba(0,0,0,0.4)"
                strokeWidth="1"
              />
            </g>
          );
        })}

        {/* axis labels */}
        <text
          x={pad + 4}
          y={pad + 10}
          fill="rgba(255,255,255,0.4)"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          share
        </text>
        <text
          x={pad + innerW - 32}
          y={pad + innerH - 4}
          fill="rgba(255,255,255,0.4)"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
        >
          points →
        </text>
      </svg>
    </div>
  );
}
