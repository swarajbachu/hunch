"use client";

import { motion, MotionValue, useTransform } from "framer-motion";
import { ReactNode } from "react";
import { CountdownRing } from "./CountdownRing";

const GRADIENTS: Record<string, string> = {
  default: "from-violet-500/30 via-fuchsia-500/20 to-rose-500/10",
  demo: "from-emerald-500/30 via-teal-500/20 to-cyan-500/10",
  meta: "from-amber-500/30 via-orange-500/20 to-rose-500/10",
  vibes: "from-pink-500/30 via-rose-500/20 to-red-500/10",
  judges: "from-indigo-500/30 via-blue-500/20 to-cyan-500/10",
};

export type CardData = {
  id: string;
  text: string;
  category?: string;
  yesCount: number;
  noCount: number;
  resolved: boolean;
  outcome?: "YES" | "NO" | null;
  startedAt?: number;
  durationMs?: number;
};

export function QuestionCard({
  card,
  footer,
}: {
  card: CardData;
  footer?: ReactNode;
}) {
  const grad = GRADIENTS[card.category ?? "default"] ?? GRADIENTS.default;
  const total = card.yesCount + card.noCount;
  const yesPct = total > 0 ? Math.round((card.yesCount / total) * 100) : 50;
  const noPct = 100 - yesPct;

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden border border-white/10 bg-zinc-950 shadow-[0_30px_120px_-30px_rgba(124,58,237,0.6)]">
      <div className={`absolute inset-0 bg-gradient-to-br ${grad}`} />
      <div className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.08),transparent)]" />

      <div className="relative h-full flex flex-col p-6">
        <div className="flex items-start justify-between">
          <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs uppercase tracking-widest text-white/80">
            {card.category ?? "Live"}
          </span>
          {card.resolved ? (
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                card.outcome === "YES"
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                  : "bg-rose-500/20 border-rose-400/40 text-rose-200"
              }`}
            >
              Resolved · {card.outcome}
            </span>
          ) : card.startedAt ? (
            <CountdownRing
              startedAt={card.startedAt}
              durationMs={card.durationMs}
              size={56}
            />
          ) : null}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <h2 className="text-3xl sm:text-4xl font-black text-center leading-snug">
            {card.text}
          </h2>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span className="text-rose-300">NO {noPct}%</span>
            <span className="text-white/40 text-xs uppercase tracking-widest">
              {total} {total === 1 ? "vote" : "votes"}
            </span>
            <span className="text-emerald-300">YES {yesPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden flex">
            <div className="bg-rose-500/80 transition-all" style={{ width: `${noPct}%` }} />
            <div className="bg-emerald-500/80 transition-all" style={{ width: `${yesPct}%` }} />
          </div>
          {footer}
        </div>
      </div>
    </div>
  );
}

export function SwipeOverlay({ x }: { x: MotionValue<number> }) {
  const yesBg = useTransform(x, [0, 160], [0, 0.7]);
  const noBg = useTransform(x, [-160, 0], [0.7, 0]);
  const yesScale = useTransform(x, [0, 160], [0.85, 1.1]);
  const noScale = useTransform(x, [-160, 0], [1.1, 0.85]);
  return (
    <>
      <motion.div
        style={{ opacity: yesBg }}
        className="pointer-events-none absolute inset-0 rounded-3xl bg-emerald-500/30"
      />
      <motion.div
        style={{ opacity: noBg }}
        className="pointer-events-none absolute inset-0 rounded-3xl bg-rose-500/30"
      />
      <motion.div
        style={{ opacity: yesBg, scale: yesScale }}
        className="pointer-events-none absolute top-8 right-6 px-4 py-2 rounded-xl border-2 border-emerald-300 text-emerald-200 font-black text-2xl -rotate-12"
      >
        YES
      </motion.div>
      <motion.div
        style={{ opacity: noBg, scale: noScale }}
        className="pointer-events-none absolute top-8 left-6 px-4 py-2 rounded-xl border-2 border-rose-300 text-rose-200 font-black text-2xl rotate-12"
      >
        NO
      </motion.div>
    </>
  );
}
