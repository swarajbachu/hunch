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
import { AllocationBars } from "./distribute/AllocationBars";
import { CurveCompare } from "./distribute/CurveCompare";
import { SqrtCurve } from "./distribute/SqrtCurve";
import { MetricTiles } from "./distribute/MetricTiles";

const STARTING_POINTS = 1000;
const DEFAULT_GAS_DRIP = parseEther("0.005");

const CURVE_DESCRIPTIONS: Record<Curve, string> = {
  quadratic: "share ∝ √points — rewards breadth over whales",
  linear: "share ∝ points — top-heavy, winner-take-most",
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

  const gasDrip = mode === "onchain" ? DEFAULT_GAS_DRIP : 0n;

  const allocations = useMemo(
    () =>
      computeAllocations(players, {
        percentile: percent / 100,
        curve,
        excludeBelowStart,
        startingPoints: STARTING_POINTS,
        poolWei: depositedWei,
        gasDripPerWinnerWei: gasDrip,
      }),
    [players, percent, curve, excludeBelowStart, depositedWei, gasDrip]
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
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-8 rounded-3xl bg-zinc-950 border border-white/10 p-5 sm:p-6 flex flex-col gap-5">
        {done ? (
          <div className="text-center py-10">
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black">
                  {alreadyEnded ? "Distribute the pool" : "Preview distribution"}
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  {alreadyEnded
                    ? "Sign once to send every winner their share."
                    : "Live preview — end the presentation to finalize."}
                  {mode === "simulated" && (
                    <span className="ml-1 text-amber-300">· simulated mode</span>
                  )}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white/40 hover:text-white text-2xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <MetricTiles
              poolWei={depositedWei}
              allocations={allocations.winners}
              distributableWei={allocations.distributable}
              curve={curve}
            />

            <section className="grid sm:grid-cols-[1fr_auto] gap-3 items-center">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] uppercase tracking-widest text-white/40">
                    Top % cut
                  </label>
                  <span className="text-lg font-black tabular-nums">
                    {percent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={percent}
                  onChange={(e) => setPercent(Number(e.target.value))}
                  className="w-full accent-brand-500"
                />
                <label className="flex items-center gap-2 text-[11px] text-white/50 mt-1.5">
                  <input
                    type="checkbox"
                    checked={excludeBelowStart}
                    onChange={(e) => setExcludeBelowStart(e.target.checked)}
                    className="accent-brand-500"
                  />
                  Skip players still at starting {STARTING_POINTS} pts
                </label>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] uppercase tracking-widest text-white/40">
                  Curve
                </span>
                <div className="flex gap-1.5">
                  {(["linear", "quadratic", "equal"] as Curve[]).map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurve(c)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize ${
                        curve === c
                          ? "bg-brand-600 border-brand-500"
                          : "bg-white/5 border-white/10 hover:bg-white/10"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-white/40 max-w-[220px]">
                  {CURVE_DESCRIPTIONS[curve]}
                </p>
              </div>
            </section>

            <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-white/40">
                    Allocations
                  </span>
                  <span className="text-[10px] text-white/40">
                    {Number(formatEther(totalDistributed)).toFixed(4)} /{" "}
                    {Number(formatEther(allocations.distributable)).toFixed(4)}{" "}
                    MON
                  </span>
                </div>
                <AllocationBars allocations={allocations.winners} />
                {mode === "onchain" && allocations.reservedForDrip > 0n && (
                  <p className="text-[10px] text-white/40">
                    +{" "}
                    <span className="font-mono">
                      {formatEther(allocations.reservedForDrip)}
                    </span>{" "}
                    MON reserved as gas drip so winners can self-claim.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <SqrtCurve allocations={allocations.winners} curve={curve} />
                <CurveCompare
                  players={players}
                  percentile={percent / 100}
                  excludeBelowStart={excludeBelowStart}
                  startingPoints={STARTING_POINTS}
                  poolWei={depositedWei}
                  gasDripPerWinnerWei={gasDrip}
                  selected={curve}
                />
              </div>
            </div>

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
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-white/10 hover:bg-white/15 py-3 font-semibold text-white/80"
                >
                  Close preview
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
