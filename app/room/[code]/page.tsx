"use client";

import { use, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { JoinFlow } from "@/components/JoinFlow";
import { SwipeDeck } from "@/components/SwipeDeck";
import { CardData } from "@/components/QuestionCard";
import { PointsPill } from "@/components/PointsPill";
import { Leaderboard } from "@/components/Leaderboard";
import { WinCelebration } from "@/components/WinCelebration";

type RouteParams = Promise<{ code: string }>;

export default function RoomAudiencePage({ params }: { params: RouteParams }) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const room = useQuery(api.rooms.getByCode, { code });
  const [me, setMe] = useState<{ address: string; name: string } | null>(null);

  if (room === undefined) {
    return (
      <main className="min-h-dvh flex items-center justify-center text-white/60">
        Loading room…
      </main>
    );
  }
  if (room === null) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold">Room not found</h1>
        <p className="text-white/60">Double-check the code or ask the host.</p>
        <Link href="/" className="text-brand-500 underline">Back to home</Link>
      </main>
    );
  }

  if (!me) {
    return (
      <JoinFlow
        roomCode={code}
        onJoined={(address, name) => setMe({ address, name })}
      />
    );
  }

  return <Room code={code} roomName={room.name} address={me.address} />;
}

function Room({
  code,
  roomName,
  address,
}: {
  code: string;
  roomName: string;
  address: string;
}) {
  const questions = useQuery(api.questions.listByRoom, { roomCode: code });
  const meDoc = useQuery(api.users.getMe, { roomCode: code, address });
  const votesByUser = useQuery(api.votes.listByUser, { roomCode: code, address });
  const submitVote = useMutation(api.votes.submit);

  const cards: CardData[] = useMemo(() => {
    if (!questions || !votesByUser) return [];
    const votedIds = new Set(votesByUser.map((v) => v.questionId as string));
    return questions
      .filter((q) => !q.resolved && !votedIds.has(q._id))
      .map((q) => ({
        id: q._id,
        text: q.text,
        category: q.category,
        yesCount: q.yesCount,
        noCount: q.noCount,
        resolved: q.resolved,
        outcome: q.outcome,
      }));
  }, [questions, votesByUser]);

  async function handleSwipe(card: CardData, side: "YES" | "NO") {
    try {
      await submitVote({
        roomCode: code,
        address,
        questionId: card.id as never,
        side,
      });
      const total = card.yesCount + card.noCount + 1;
      const yesPct = Math.round(
        ((card.yesCount + (side === "YES" ? 1 : 0)) / total) * 100
      );
      const agree = side === "YES" ? yesPct : 100 - yesPct;
      toast(`${side} · 100 staked`, {
        description: `${agree}% of the room agrees with you`,
      });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col px-4 pt-3 pb-8">
      <WinCelebration roomCode={code} address={address} />

      <header className="flex items-center justify-between gap-3 mb-4">
        <div className="min-w-0">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-white/40 hover:text-white/60"
          >
            Hunch · {code}
          </Link>
          <h1 className="text-lg font-bold leading-tight truncate">{roomName}</h1>
          <button
            onClick={() => {
              navigator.clipboard.writeText(address);
              toast.success("Wallet address copied", {
                description: "Deposit MON to fund this player",
              });
            }}
            className="mt-1 font-mono text-[10px] text-white/40 hover:text-white/70"
            title="Tap to copy — deposit MON to fund"
          >
            {address.slice(0, 6)}…{address.slice(-4)}
          </button>
        </div>
        <PointsPill value={meDoc?.points ?? 1000} />
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-sm">
          <SwipeDeck cards={cards} onSwipe={handleSwipe} />
          <div className="mt-6 flex justify-between gap-3">
            <button
              onClick={() => cards[0] && handleSwipe(cards[0], "NO")}
              disabled={cards.length === 0}
              className="flex-1 py-3 rounded-2xl border border-rose-400/40 bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 font-black text-rose-200"
            >
              ← NO
            </button>
            <button
              onClick={() => cards[0] && handleSwipe(cards[0], "YES")}
              disabled={cards.length === 0}
              className="flex-1 py-3 rounded-2xl border border-emerald-400/40 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:opacity-40 font-black text-emerald-200"
            >
              YES →
            </button>
          </div>
        </div>
      </div>

      <section className="mt-8 max-w-sm mx-auto w-full">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm uppercase tracking-widest text-white/40">
            Leaderboard
          </h2>
          <Link
            href={`/room/${code}/screen`}
            className="text-xs text-white/40 hover:text-white/70"
          >
            big screen ↗
          </Link>
        </div>
        <Leaderboard roomCode={code} meAddress={address} limit={8} />
      </section>
    </main>
  );
}
