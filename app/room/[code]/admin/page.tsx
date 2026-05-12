"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { AdminQuestionForm } from "@/components/AdminQuestionForm";
import { AdminQuestionRow } from "@/components/AdminQuestionRow";
import { RoomQR } from "@/components/RoomQR";
import { Leaderboard } from "@/components/Leaderboard";

type RouteParams = Promise<{ code: string }>;

export default function AdminPage({ params }: { params: RouteParams }) {
  const { code: rawCode } = use(params);
  const code = rawCode.toUpperCase();
  const searchParams = useSearchParams();
  const adminCode = searchParams.get("key") ?? "";

  const room = useQuery(api.rooms.getByCode, { code });
  const questions = useQuery(api.questions.listByRoom, { roomCode: code });

  if (room === undefined) {
    return (
      <main className="min-h-dvh flex items-center justify-center text-white/60">
        Loading…
      </main>
    );
  }
  if (room === null) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold">Room not found</h1>
        <Link href="/" className="text-brand-500 underline">Back home</Link>
      </main>
    );
  }
  if (!adminCode) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold">Admin code required</h1>
        <p className="text-white/60">Add <code className="px-1.5 py-0.5 bg-white/10 rounded">?key=YOURCODE</code> to the URL.</p>
        <Link href="/" className="text-brand-500 underline">Back home</Link>
      </main>
    );
  }

  const sorted = [...(questions ?? [])].sort((a, b) => {
    if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  return (
    <main className="min-h-dvh px-4 py-6 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-white/40">
            Hosting · admin
          </div>
          <h1 className="text-2xl font-black">{room.name}</h1>
        </div>
        <Link
          href={`/room/${code}/screen`}
          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-sm"
        >
          Open big screen ↗
        </Link>
      </header>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="flex flex-col gap-4">
          <AdminQuestionForm roomCode={code} adminCode={adminCode} />

          <div className="flex flex-col gap-2">
            <h2 className="text-sm uppercase tracking-widest text-white/40 mt-2">
              Questions
            </h2>
            {sorted.length === 0 && (
              <div className="text-white/40 text-sm">
                No questions yet. Push one above.
              </div>
            )}
            {sorted.map((q) => (
              <AdminQuestionRow
                key={q._id}
                roomCode={code}
                adminCode={adminCode}
                question={q}
              />
            ))}
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <RoomQR code={code} />
          <div>
            <h3 className="text-sm uppercase tracking-widest text-white/40 mb-2">
              Leaderboard
            </h3>
            <Leaderboard roomCode={code} limit={10} />
          </div>
        </aside>
      </div>
    </main>
  );
}
