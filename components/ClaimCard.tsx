"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { formatEther } from "viem";
import { api } from "@/convex/_generated/api";
import {
  HUNCH_POOL_ADDRESS,
  claimFromPool,
  explorerTxUrl,
} from "@/lib/hunchPool";
import { readBurnerPk } from "@/lib/burnerWallet";

export function ClaimCard({
  roomCode,
  address,
  mode,
}: {
  roomCode: string;
  address: string;
  mode: "onchain" | "simulated" | null;
}) {
  const payout = useQuery(api.payouts.forUser, { roomCode, address });
  const markClaimed = useMutation(api.payouts.markClaimed);
  const [busy, setBusy] = useState(false);

  if (payout === undefined) {
    return (
      <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-8 text-center text-white/60">
        Checking your winnings…
      </div>
    );
  }

  if (payout === null) {
    return (
      <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-8 text-center">
        <div className="text-4xl mb-3">🎬</div>
        <h2 className="text-xl font-bold">Pool closed</h2>
        <p className="text-white/60 mt-2">
          You didn't make the cut this round — your wallet keeps your points
          history for the next presentation.
        </p>
      </div>
    );
  }

  const amountWei = BigInt(payout.amountWei);

  async function onClaim() {
    if (mode === "simulated") {
      setBusy(true);
      try {
        await markClaimed({ roomCode, address });
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.5 } });
        toast.success("Claimed (simulated)");
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!HUNCH_POOL_ADDRESS) {
      toast.error("Pool contract not deployed — claim unavailable");
      return;
    }
    const pk = readBurnerPk(roomCode);
    if (!pk) {
      toast.error("No wallet found for this room");
      return;
    }
    setBusy(true);
    try {
      const tx = await claimFromPool({ roomCode, burnerPrivateKey: pk });
      if (!tx) throw new Error("Claim failed");
      await markClaimed({ roomCode, address, txHash: tx });
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.5 } });
      toast.success("Claimed to your wallet");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-emerald-500/20 via-brand-500/15 to-amber-500/10 border border-emerald-400/30 p-6 text-center animate-reveal-pop">
      <div className="text-xs uppercase tracking-[0.3em] text-emerald-200">
        You won · rank #{payout.rank}
      </div>
      <div className="my-4">
        <div className="text-6xl font-black tabular-nums">
          {Number(formatEther(amountWei)).toFixed(4)}
        </div>
        <div className="text-emerald-200/80 font-semibold">MON</div>
      </div>
      <div className="text-xs text-white/50 mb-5">
        {payout.points} pts · burner {address.slice(0, 6)}…{address.slice(-4)}
      </div>

      {payout.claimed ? (
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm">
          ✓ Claimed
          {payout.claimedTxHash && (
            <a
              href={explorerTxUrl(payout.claimedTxHash)}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-brand-500 hover:underline"
            >
              tx ↗
            </a>
          )}
        </div>
      ) : (
        <button
          onClick={onClaim}
          disabled={busy}
          className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 py-3 font-black disabled:opacity-50"
        >
          {busy ? "Claiming…" : mode === "simulated" ? "Claim (simulated)" : "Claim to wallet"}
        </button>
      )}
    </div>
  );
}
