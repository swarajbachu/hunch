"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export function PointsPill({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    if (value === prev.current) return;
    const start = prev.current;
    const end = value;
    const duration = 600;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    prev.current = value;
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const delta = value - prev.current;

  return (
    <motion.div
      key={value}
      initial={{ scale: 1 }}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 0.35 }}
      className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 font-mono font-bold tabular-nums"
    >
      <span className="text-white/60 text-xs mr-1">pts</span>
      {display}
      {delta !== 0 && (
        <span className={`ml-1 text-xs ${delta > 0 ? "text-emerald-300" : "text-rose-300"}`}>
          {delta > 0 ? "+" : ""}
          {delta}
        </span>
      )}
    </motion.div>
  );
}
