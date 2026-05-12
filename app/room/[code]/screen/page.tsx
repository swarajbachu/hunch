"use client";

import { use, useEffect, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Leaderboard } from "@/components/Leaderboard";
import { RoomQR } from "@/components/RoomQR";
import { CountdownRing } from "@/components/CountdownRing";
import { useCountdown } from "@/lib/useCountdown";
import { VotePulseFeed } from "@/components/VotePulseFeed";

type RouteParams = Promise<{ code: string }>;

export default function ScreenPage({ params }: { params: RouteParams }) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const room = useQuery(api.rooms.getByCode, { code });
  const questions = useQuery(api.questions.listByRoom, { roomCode: code });

  const [, force] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => force((t) => t + 1), 250);
    return () => window.clearInterval(id);
  }, []);

  // Show the most-recent started, unresolved question. Stays on it through
  // the locked-but-unresolved "reveal moment" until admin resolves.
  const liveQ = questions
    ?.slice()
    .reverse()
    .find((q) => q.startedAt && !q.resolved);

  const { expired, secondsLeft } = useCountdown(liveQ?.startedAt, liveQ?.durationMs);
  const total = (liveQ?.yesCount ?? 0) + (liveQ?.noCount ?? 0);
  const yesPct = total > 0 ? Math.round(((liveQ?.yesCount ?? 0) / total) * 100) : 50;
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
      <section
        className={`rounded-3xl border p-10 flex flex-col transition ${
          expired
            ? "bg-amber-500/[0.08] border-amber-400/30"
            : liveQ
            ? "bg-emerald-500/[0.04] border-emerald-400/20"
            : "bg-white/[0.04] border-white/10"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm uppercase tracking-[0.3em] text-white/40">
            {room.name} · {expired ? "reveal" : liveQ ? "voting open" : "standby"}
          </div>
          {liveQ && (
            <div className="flex items-center gap-3">
              {!expired ? (
                <div
                  className={`text-7xl font-black tabular-nums ${
                    secondsLeft <= 5 ? "text-rose-300 animate-pulse" : "text-white"
                  }`}
                >
                  {secondsLeft}
                </div>
              ) : (
                <div className="text-3xl font-black text-amber-200">⏰ time</div>
              )}
              <CountdownRing
                startedAt={liveQ.startedAt}
                durationMs={liveQ.durationMs}
                size={80}
              />
            </div>
          )}
        </div>

        {liveQ ? (
          <>
            <h1 className="text-6xl font-black leading-tight">{liveQ.text}</h1>
            {expired ? (
              <div
                key={liveQ._id + "-reveal"}
                className="mt-auto animate-reveal-pop"
              >
                <div className="text-center text-amber-200 uppercase tracking-[0.4em] text-sm mb-3">
                  Awaiting host's call
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="rounded-2xl bg-rose-500/15 border border-rose-400/30 p-6 text-center">
                    <div className="text-rose-300 text-xs uppercase tracking-widest">NO</div>
                    <div className="text-7xl font-black text-rose-200 mt-1">{noPct}%</div>
                    <div className="text-rose-300/70 text-sm mt-1">{liveQ.noCount} votes</div>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/15 border border-emerald-400/30 p-6 text-center">
                    <div className="text-emerald-300 text-xs uppercase tracking-widest">YES</div>
                    <div className="text-7xl font-black text-emerald-200 mt-1">{yesPct}%</div>
                    <div className="text-emerald-300/70 text-sm mt-1">{liveQ.yesCount} votes</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-auto relative">
                <VotePulseFeed questionId={liveQ._id} />
                <div className="flex items-end justify-between mb-3 text-3xl font-black">
                  <span className="text-rose-300">NO {noPct}%</span>
                  <span className="text-white/40 text-base font-normal">
                    {total} {total === 1 ? "vote" : "votes"}
                  </span>
                  <span className="text-emerald-300">YES {yesPct}%</span>
                </div>
                <div className="h-5 rounded-full bg-white/10 overflow-hidden flex">
                  <div
                    className="bg-rose-500/80 transition-all duration-500"
                    style={{ width: `${noPct}%` }}
                  />
                  <div
                    className="bg-emerald-500/80 transition-all duration-500"
                    style={{ width: `${yesPct}%` }}
                  />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-3xl font-bold text-white/40 text-center">
            Waiting for the host to start the next question…
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
