"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { formatEther, parseEther, type Address } from "viem";
import confetti from "canvas-confetti";
import { api } from "@/convex/_generated/api";
import {
  HUNCH_POOL_ADDRESS,
  explorerTxUrl,
  finalizePool,
} from "@/lib/hunchPool";
import {
  computeAllocations,
  type Curve,
  type Player,
} from "@/lib/distribute";

const STARTING_POINTS = 1000;
const DEFAULT_GAS_DRIP = parseEther("0.005");

const CURVE_DESCRIPTIONS: Record<Curve, string> = {
  quadratic: "share ∝ √points — flatter, rewards participation",
  linear: "share ∝ points — top-heavy",
  equal: "everyone in the cut gets the same",
};

export function DistributeWizard({
  roomCode,
  adminCode,
  depositedWei,
  mode,
  alreadyEnded,
  onClose,
}: {
  roomCode: string;
  adminCode: string;
  depositedWei: bigint;
  mode: "onchain" | "simulated";
  alreadyEnded: boolean;
  onClose: () => void;
}) {
  const leaderboard = useQuery(api.leaderboard.topByRoom, {
    roomCode,
    limit: 200,
  });
  const recordFinalize = useMutation(api.payouts.recordFinalize);

  const [percent, setPercent] = useState(20);
  const [curve, setCurve] = useState<Curve>("quadratic");
  const [excludeBelowStart, setExcludeBelowStart] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ txHash?: string } | null>(null);

  const players: Player[] = useMemo(
    () =>
      (leaderboard ?? []).map((u) => ({
        address: u.address,
        displayName: u.displayName,
        points: u.points,
      })),
    [leaderboard]
  );

  const allocations = useMemo(
    () =>
      computeAllocations(players, {
        percentile: percent / 100,
        curve,
        excludeBelowStart,
        startingPoints: STARTING_POINTS,
        poolWei: depositedWei,
        gasDripPerWinnerWei: mode === "onchain" ? DEFAULT_GAS_DRIP : 0n,
      }),
    [players, percent, curve, excludeBelowStart, depositedWei, mode]
  );

  const totalDistributed = allocations.winners.reduce(
    (a, b) => a + b.amountWei,
    0n
  );

  async function sign() {
    if (allocations.winners.length === 0) {
      toast.error("No eligible winners — loosen the cut");
      return;
    }
    setBusy(true);
    try {
      let txHash: string | undefined;
      let finalizeMode: "onchain" | "simulated" = mode;

      if (mode === "onchain" && HUNCH_POOL_ADDRESS) {
        const hash = await finalizePool({
          roomCode,
          winners: allocations.winners.map((a) => a.address as Address),
          amountsWei: allocations.winners.map((a) => a.amountWei),
          gasDripPerWinnerWei: DEFAULT_GAS_DRIP,
        });
        if (hash) {
          txHash = hash;
        } else {
          finalizeMode = "simulated";
          toast.warning("No wallet available — finalizing in simulated mode");
        }
      }

      await recordFinalize({
        roomCode,
        adminCode,
        txHash,
        mode: finalizeMode,
        payouts: allocations.winners.map((a) => ({
          address: a.address,
          displayName: a.displayName,
          amountWei: a.amountWei.toString(),
          rank: a.rank,
          points: a.points,
        })),
      });

      confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 } });
      setDone({ txHash });
      toast.success("Pool finalized");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
      <div className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-zinc-950 border border-white/10 p-6 flex flex-col gap-5">
        {done ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="text-2xl font-black">Pool distributed</h2>
            <p className="text-white/60 mt-2">
              {allocations.winners.length} winners ·{" "}
              {formatEther(totalDistributed)} MON allocated
            </p>
            {done.txHash && (
              <a
                href={explorerTxUrl(done.txHash)}
                target="_blank"
                rel="noreferrer"
                className="inline-block mt-4 text-brand-500 hover:underline"
              >
                view finalize tx on Monad ↗
              </a>
            )}
            <button
              onClick={onClose}
              className="mt-6 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 font-semibold"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black">
                {alreadyEnded ? "Distribute the pool" : "Preview distribution"}
              </h2>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white text-xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-white/60">
              Pool:{" "}
              <span className="font-mono font-bold text-white">
                {formatEther(depositedWei)} MON
              </span>
              {mode === "simulated" && (
                <span className="ml-2 text-amber-300">(simulated)</span>
              )}
              {!alreadyEnded && (
                <span className="ml-2 text-white/40">
                  · live preview — end the presentation to finalize
                </span>
              )}
            </p>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm uppercase tracking-widest text-white/40">
                  Top % cut
                </label>
                <span className="text-2xl font-black tabular-nums">{percent}%</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                step={5}
                value={percent}
                onChange={(e) => setPercent(Number(e.target.value))}
                className="accent-brand-500"
              />
              <label className="flex items-center gap-2 text-sm text-white/60 mt-1">
                <input
                  type="checkbox"
                  checked={excludeBelowStart}
                  onChange={(e) => setExcludeBelowStart(e.target.checked)}
                  className="accent-brand-500"
                />
                Only players above {STARTING_POINTS} pts (skip the inactive)
              </label>
            </section>

            <section className="flex flex-col gap-2">
              <label className="text-sm uppercase tracking-widest text-white/40">
                Curve
              </label>
              <div className="flex gap-2">
                {(["quadratic", "linear", "equal"] as Curve[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurve(c)}
                    className={`flex-1 px-3 py-2 rounded-xl border text-sm font-semibold capitalize ${
                      curve === c
                        ? "bg-brand-600 border-brand-500"
                        : "bg-white/5 border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="text-xs text-white/40">{CURVE_DESCRIPTIONS[curve]}</p>
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm uppercase tracking-widest text-white/40">
                  Preview · {allocations.winners.length} winner
                  {allocations.winners.length === 1 ? "" : "s"}
                </label>
                <span className="text-xs text-white/40">
                  {formatEther(totalDistributed)} /{" "}
                  {formatEther(allocations.distributable)} MON distributable
                </span>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 max-h-64 overflow-y-auto">
                {allocations.winners.length === 0 ? (
                  <div className="p-4 text-white/40 text-sm">
                    No eligible winners with current settings.
                  </div>
                ) : (
                  <ol className="flex flex-col">
                    {allocations.winners.map((a) => (
                      <li
                        key={a.address}
                        className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/5 last:border-0"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="w-6 text-center text-white/40 font-bold">
                            {a.rank}
                          </span>
                          <span className="truncate font-semibold">
                            {a.displayName}
                          </span>
                          <span className="text-xs text-white/40">
                            {a.points} pts
                          </span>
                        </span>
                        <span className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-white/40">
                            {(a.share * 100).toFixed(1)}%
                          </span>
                          <span className="font-mono font-bold tabular-nums">
                            {Number(formatEther(a.amountWei)).toFixed(4)}
                          </span>
                          <span className="text-xs text-white/40">MON</span>
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              {mode === "onchain" && allocations.reservedForDrip > 0n && (
                <p className="text-xs text-white/40">
                  +{" "}
                  <span className="font-mono">
                    {formatEther(allocations.reservedForDrip)}
                  </span>{" "}
                  MON reserved as gas drip so winners can self-claim.
                </p>
              )}
            </section>

            {alreadyEnded ? (
              <button
                onClick={sign}
                disabled={busy || allocations.winners.length === 0}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 py-3 font-black disabled:opacity-50"
              >
                {busy
                  ? "Finalizing…"
                  : mode === "onchain"
                  ? "Sign finalize tx →"
                  : "Finalize (simulated) →"}
              </button>
            ) : (
              <button
                onClick={onClose}
                className="rounded-xl bg-white/10 hover:bg-white/15 py-3 font-semibold text-white/80"
              >
                Close preview
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
