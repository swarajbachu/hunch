"use client";

import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  getOrCreateBurner,
  readBurner,
  readDisplayName,
  saveDisplayName,
} from "@/lib/burnerWallet";
import { api } from "@/convex/_generated/api";

export function JoinFlow({
  roomCode,
  onJoined,
}: {
  roomCode: string;
  onJoined: (address: string, displayName: string) => void;
}) {
  const upsert = useMutation(api.users.upsert);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const savedName = readDisplayName(roomCode);
    const existing = readBurner(roomCode);
    if (savedName && existing) {
      upsert({ roomCode, address: existing.address, displayName: savedName })
        .then(() => onJoined(existing.address, savedName))
        .catch((e) => toast.error((e as Error).message));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Enter your name");
      return;
    }
    setSubmitting(true);
    try {
      const account = getOrCreateBurner(roomCode);
      saveDisplayName(roomCode, trimmed);
      await upsert({ roomCode, address: account.address, displayName: trimmed });
      onJoined(account.address, trimmed);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-md flex flex-col gap-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest text-white/60 mb-3">
            Room · {roomCode}
          </div>
          <h1 className="text-4xl font-black">Join the hunch</h1>
          <p className="text-white/60 mt-2">
            We'll spin you up a wallet on Monad. No signups, no popups.
          </p>
        </div>

        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col gap-4">
          <label className="text-sm text-white/60">Your name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Satoshi"
            autoFocus
            className="rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-brand-500 text-lg"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 py-3 font-semibold transition"
          >
            {submitting ? "Creating wallet…" : "Start swiping"}
          </button>
        </section>

        <p className="text-center text-xs text-white/30">
          Wallet is generated in your browser and stored locally. Address shows on
          your profile so anyone can deposit MON.
        </p>
      </div>
    </main>
  );
}
