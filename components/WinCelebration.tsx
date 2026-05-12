"use client";

import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

const PAYOUT_NET = 100;

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
  const seenRef = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!votes || !questions) return;
    const qMap = new Map(questions.map((q) => [q._id, q]));

    if (!initialized.current) {
      for (const v of votes) {
        const q = qMap.get(v.questionId);
        if (q?.resolved) seenRef.current.add(v._id);
      }
      initialized.current = true;
      return;
    }

    for (const v of votes) {
      if (seenRef.current.has(v._id)) continue;
      const q = qMap.get(v.questionId);
      if (!q || !q.resolved) continue;
      seenRef.current.add(v._id);

      const won = v.side === q.outcome;
      if (won) {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.5 },
          colors: ["#7C3AED", "#EC4899", "#10B981", "#F59E0B"],
        });
        toast.success(`+${PAYOUT_NET} points · you called it`, {
          description: q.text,
        });
      } else {
        toast(`Tough one — resolved ${q.outcome}`, {
          description: q.text,
        });
      }
    }
  }, [votes, questions]);

  return null;
}
