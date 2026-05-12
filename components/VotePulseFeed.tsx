"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

type Pulse = { id: string; side: "YES" | "NO"; spawnedAt: number };

export function VotePulseFeed({ questionId }: { questionId: Id<"questions"> | null }) {
  const votes = useQuery(
    api.votes.listByQuestion,
    questionId ? { questionId } : "skip"
  );
  const [pulses, setPulses] = useState<Pulse[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const initRef = useRef(false);

  useEffect(() => {
    if (!votes) return;
    if (!initRef.current) {
      for (const v of votes) seenRef.current.add(v._id);
      initRef.current = true;
      return;
    }
    const fresh: Pulse[] = [];
    for (const v of votes) {
      if (seenRef.current.has(v._id)) continue;
      seenRef.current.add(v._id);
      fresh.push({ id: v._id, side: v.side, spawnedAt: Date.now() });
    }
    if (fresh.length > 0) {
      setPulses((prev) => [...prev, ...fresh].slice(-40));
    }
  }, [votes]);

  // Reset seen-set when the question changes (so a new question's history
  // doesn't fire a flood of pulses on load).
  useEffect(() => {
    seenRef.current = new Set();
    initRef.current = false;
    setPulses([]);
  }, [questionId]);

  useEffect(() => {
    if (pulses.length === 0) return;
    const id = window.setTimeout(() => {
      const cutoff = Date.now() - 2500;
      setPulses((prev) => prev.filter((p) => p.spawnedAt > cutoff));
    }, 300);
    return () => window.clearTimeout(id);
  }, [pulses]);

  if (!questionId) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 overflow-hidden">
      {pulses.map((p) => (
        <span
          key={p.id}
          className={`absolute bottom-2 inline-block w-3 h-3 rounded-full animate-vote-pulse ${
            p.side === "YES" ? "bg-emerald-400" : "bg-rose-400"
          }`}
          style={{
            left: `${10 + ((parseInt(p.id.slice(-4), 36) || 0) % 80)}%`,
          }}
        />
      ))}
    </div>
  );
}
