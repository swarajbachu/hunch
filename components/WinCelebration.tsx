"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

export function WinCelebration({
  roomCode,
  address,
}: {
  roomCode: string;
  address: string | null;
}) {
  const votes = useQuery(
    api.votes.listByUser,
    address ? { roomCode, address } : "skip"
  );
  const questions = useQuery(api.questions.listByRoom, { roomCode });
  const leaderboard = useQuery(api.leaderboard.topByRoom, { roomCode, limit: 100 });
  const seenRef = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const lastRankRef = useRef<number | null>(null);

  // Track our rank every render so we can show pre→post delta on a win.
  const myRank = (() => {
    if (!leaderboard || !address) return null;
    const idx = leaderboard.findIndex((u) => u.address === address.toLowerCase());
    return idx === -1 ? null : idx + 1;
  })();

  useEffect(() => {
    if (!votes || !questions) return;
    const qMap = new Map(questions.map((q) => [q._id, q]));

    if (!initialized.current) {
      for (const v of votes) {
        const q = qMap.get(v.questionId);
        if (q?.resolved) seenRef.current.add(v._id);
      }
      initialized.current = true;
      lastRankRef.current = myRank;
      return;
    }

    const prevRank = lastRankRef.current;

    for (const v of votes) {
      if (seenRef.current.has(v._id)) continue;
      const q = qMap.get(v.questionId);
      if (!q || !q.resolved) continue;
      seenRef.current.add(v._id);

      const won = v.side === q.outcome;
      if (won) {
        const bonus = (v as { bonus?: number }).bonus ?? 0;
        const payout = 100 + bonus; // net WIN_PAYOUT - STAKE = 100, plus bonuses
        confetti({
          particleCount: 110,
          spread: 80,
          origin: { y: 0.5 },
          colors: ["#7C3AED", "#EC4899", "#10B981", "#F59E0B"],
        });
        const rankNote =
          prevRank && myRank && myRank < prevRank
            ? ` · #${prevRank} → #${myRank} 🚀`
            : myRank
            ? ` · now #${myRank}`
            : "";
        toast.success(`+${payout} points${bonus > 0 ? " 🔥" : ""}`, {
          description: `${q.text}${rankNote}`,
        });
      } else {
        toast(`Tough one — resolved ${q.outcome}`, {
          description: q.text,
        });
      }
    }

    lastRankRef.current = myRank;
  }, [votes, questions, myRank]);

  return null;
}
