"use client";

import {
  AnimatePresence,
  motion,
  PanInfo,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { useMemo, useState } from "react";
import { CardData, QuestionCard, SwipeOverlay } from "./QuestionCard";

const SWIPE_THRESHOLD = 110;

export function SwipeDeck({
  cards,
  onSwipe,
}: {
  cards: CardData[];
  onSwipe: (card: CardData, side: "YES" | "NO") => void;
}) {
  const visible = useMemo(() => cards.slice(0, 3), [cards]);
  const [exitDir, setExitDir] = useState<1 | -1 | 0>(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);

  if (visible.length === 0) {
    return (
      <div className="w-full max-w-sm aspect-[3/4] mx-auto rounded-3xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-center p-8">
        <div>
          <div className="text-5xl mb-3">⏳</div>
          <p className="text-white/70 font-semibold">Waiting for the host…</p>
          <p className="text-white/40 text-sm mt-1">
            New questions will appear here in real time.
          </p>
        </div>
      </div>
    );
  }

  function commit(side: "YES" | "NO", card: CardData) {
    setExitDir(side === "YES" ? 1 : -1);
    onSwipe(card, side);
    requestAnimationFrame(() => {
      x.set(0);
      setExitDir(0);
    });
  }

  function onDragEnd(card: CardData, _: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 600) {
      commit("YES", card);
    } else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -600) {
      commit("NO", card);
    } else {
      x.set(0);
    }
  }

  return (
    <div className="relative w-full max-w-sm aspect-[3/4] mx-auto">
      <AnimatePresence initial={false}>
        {visible
          .slice()
          .reverse()
          .map((card, idxFromBottom) => {
            const indexFromTop = visible.length - 1 - idxFromBottom;
            const isTop = indexFromTop === 0;
            const offset = indexFromTop * 8;
            const scale = 1 - indexFromTop * 0.04;

            if (!isTop) {
              return (
                <motion.div
                  key={card.id}
                  initial={false}
                  animate={{ y: offset, scale, opacity: 1 }}
                  className="absolute inset-0"
                  style={{ zIndex: 10 - indexFromTop }}
                >
                  <QuestionCard card={card} />
                </motion.div>
              );
            }

            return (
              <motion.div
                key={card.id}
                drag="x"
                dragElastic={0.6}
                onDragEnd={(e, info) => onDragEnd(card, e, info)}
                style={{ x, rotate, zIndex: 10 }}
                initial={false}
                animate={{ y: 0, scale: 1 }}
                exit={{
                  x: exitDir === 0 ? 0 : exitDir * 600,
                  rotate: exitDir * 20,
                  opacity: 0,
                  transition: { duration: 0.25 },
                }}
                className="absolute inset-0 cursor-grab active:cursor-grabbing"
              >
                <QuestionCard card={card} />
                <SwipeOverlay x={x} />
              </motion.div>
            );
          })}
      </AnimatePresence>
    </div>
  );
}
