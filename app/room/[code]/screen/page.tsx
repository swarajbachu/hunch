"use client";

import { use } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Leaderboard } from "@/components/Leaderboard";
import { RoomQR } from "@/components/RoomQR";

type RouteParams = Promise<{ code: string }>;

export default function ScreenPage({ params }: { params: RouteParams }) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const room = useQuery(api.rooms.getByCode, { code });
  const questions = useQuery(api.questions.listByRoom, { roomCode: code });

  const activeQ = questions?.slice().reverse().find((q) => !q.resolved);
  const total = (activeQ?.yesCount ?? 0) + (activeQ?.noCount ?? 0);
  const yesPct = total > 0 ? Math.round(((activeQ?.yesCount ?? 0) / total) * 100) : 50;
  const noPct = 100 - yesPct;

  if (!room) {
    return (
      <main className="min-h-dvh flex items-center justify-center text-white/60">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-8 grid grid-cols-[1.4fr_1fr] gap-8">
      <section className="rounded-3xl bg-white/[0.04] border border-white/10 p-10 flex flex-col">
        <div className="text-sm uppercase tracking-[0.3em] text-white/40 mb-4">
          {room.name} · live question
        </div>
        {activeQ ? (
          <>
            <h1 className="text-6xl font-black leading-tight">{activeQ.text}</h1>
            <div className="mt-auto">
              <div className="flex items-end justify-between mb-3 text-3xl font-black">
                <span className="text-rose-300">NO {noPct}%</span>
                <span className="text-white/40 text-base font-normal">
                  {total} {total === 1 ? "vote" : "votes"}
                </span>
                <span className="text-emerald-300">YES {yesPct}%</span>
              </div>
              <div className="h-5 rounded-full bg-white/10 overflow-hidden flex">
                <div className="bg-rose-500/80" style={{ width: `${noPct}%` }} />
                <div className="bg-emerald-500/80" style={{ width: `${yesPct}%` }} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-3xl font-bold text-white/40">
            Waiting for next question…
          </div>
        )}
      </section>

      <aside className="flex flex-col gap-6">
        <RoomQR code={code} />
        <section className="rounded-3xl bg-white/[0.04] border border-white/10 p-6 flex-1">
          <h2 className="text-sm uppercase tracking-widest text-white/40 mb-3">
            Leaderboard
          </h2>
          <Leaderboard roomCode={code} limit={8} />
        </section>
        <Link
          href={`/room/${code}`}
          className="text-center text-xs text-white/30 hover:text-white/60"
        >
          ← exit big-screen
        </Link>
      </aside>
    </main>
  );
}
