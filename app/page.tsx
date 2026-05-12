"use client";

import { useState, useTransition } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

export default function LandingPage() {
  const router = useRouter();
  const createRoom = useMutation(api.rooms.create);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [pending, startTransition] = useTransition();

  function onCreate() {
    if (!name.trim()) {
      toast.error("Give the room a name");
      return;
    }
    startTransition(async () => {
      try {
        const { code, adminCode } = await createRoom({ name });
        router.push(`/room/${code}/admin?key=${adminCode}`);
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  }

  function onJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      toast.error("Enter a room code");
      return;
    }
    router.push(`/room/${code}`);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md flex flex-col gap-8">
        <header className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-white/60 mb-4">
            On Monad · Live
          </div>
          <h1 className="text-5xl font-black tracking-tight">
            Hunch <span className="text-brand-500">Live</span>
          </h1>
          <p className="mt-3 text-white/60">
            Swipe-based prediction markets for live presentations.
          </p>
        </header>

        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-lg">Host a room</h2>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Demo Day — Stage A"
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-brand-500"
          />
          <button
            onClick={onCreate}
            disabled={pending}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 py-3 font-semibold transition"
          >
            {pending ? "Creating…" : "Create room"}
          </button>
        </section>

        <div className="text-center text-white/40 text-xs uppercase tracking-widest">or</div>

        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col gap-4">
          <h2 className="font-semibold text-lg">Join with code</h2>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            maxLength={6}
            className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-brand-500 text-center text-2xl tracking-[0.5em] font-mono"
          />
          <button
            onClick={onJoin}
            className="rounded-xl bg-white/10 hover:bg-white/15 py-3 font-semibold transition"
          >
            Join room
          </button>
        </section>

        <footer className="text-center text-white/30 text-xs">
          Built for Monad Blitz · Every resolution lands onchain
        </footer>
      </div>
    </main>
  );
}
