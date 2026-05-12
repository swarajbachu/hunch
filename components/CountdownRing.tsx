"use client";

import { useCountdown } from "@/lib/useCountdown";

export function CountdownRing({
  startedAt,
  durationMs,
  size = 64,
}: {
  startedAt?: number;
  durationMs?: number;
  size?: number;
}) {
  const { secondsLeft, fraction, expired } = useCountdown(startedAt, durationMs);
  const strokeWidth = 5;
  const r = size / 2 - strokeWidth;
  const c = 2 * Math.PI * r;
  const offset = c * fraction;
  const urgent = secondsLeft <= 5 && !expired;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${
        urgent ? "animate-pulse" : ""
      }`}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={expired ? "rgb(244,63,94)" : urgent ? "rgb(251,191,36)" : "rgb(16,185,129)"}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 100ms linear" }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-black ${
          expired ? "text-rose-300" : urgent ? "text-amber-200" : "text-white"
        }`}
        style={{ fontSize: size * 0.36 }}
      >
        {expired ? "⏰" : secondsLeft}
      </span>
    </div>
  );
}
