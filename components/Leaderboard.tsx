"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function Leaderboard({
  roomCode,
  meAddress,
  limit = 10,
}: {
  roomCode: string;
  meAddress?: string | null;
  limit?: number;
}) {
  const rows = useQuery(api.leaderboard.topByRoom, { roomCode, limit });
  const me = meAddress?.toLowerCase();

  if (rows === undefined) {
    return <div className="text-white/40 text-sm">Loading…</div>;
  }

  if (rows.length === 0) {
    return <div className="text-white/40 text-sm">No players yet.</div>;
  }

  return (
    <ol className="flex flex-col gap-1">
      {rows.map((u, i) => {
        const isMe = u.address === me;
        const acc =
          u.totalVotes > 0 ? Math.round((u.correctVotes / u.totalVotes) * 100) : null;
        return (
          <li
            key={u.address}
            className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl ${
              isMe ? "bg-brand-500/20 border border-brand-500/30" : "bg-white/[0.03]"
            }`}
          >
            <span className="flex items-center gap-3 min-w-0">
              <span
                className={`w-6 text-center font-bold ${
                  i === 0
                    ? "text-yellow-300"
                    : i === 1
                    ? "text-zinc-300"
                    : i === 2
                    ? "text-amber-600"
                    : "text-white/40"
                }`}
              >
                {i + 1}
              </span>
              <span className="truncate font-semibold">
                {u.displayName}
                {isMe ? " · you" : ""}
              </span>
            </span>
            <span className="flex items-center gap-3 shrink-0">
              {acc !== null && (
                <span className="text-xs text-white/40">{acc}% acc</span>
              )}
              <span className="font-mono font-bold tabular-nums">
                {u.points}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
