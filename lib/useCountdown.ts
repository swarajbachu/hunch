"use client";

import { useEffect, useState } from "react";

export type CountdownState = {
  msLeft: number;
  secondsLeft: number;
  fraction: number; // 0 → 1 elapsed
  expired: boolean;
};

export function useCountdown(
  startedAt: number | undefined,
  durationMs: number | undefined
): CountdownState {
  const duration = durationMs ?? 30_000;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 100);
    return () => window.clearInterval(id);
  }, [startedAt]);

  if (!startedAt) {
    return { msLeft: duration, secondsLeft: Math.ceil(duration / 1000), fraction: 0, expired: false };
  }

  const elapsed = now - startedAt;
  const msLeft = Math.max(0, duration - elapsed);
  return {
    msLeft,
    secondsLeft: Math.ceil(msLeft / 1000),
    fraction: Math.min(1, elapsed / duration),
    expired: elapsed >= duration,
  };
}
