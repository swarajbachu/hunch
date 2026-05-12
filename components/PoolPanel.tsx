"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { formatEther, parseEther } from "viem";
import { api } from "@/convex/_generated/api";
import {
  HUNCH_POOL_ADDRESS,
  depositToPool,
  explorerTxUrl,
} from "@/lib/hunchPool";
import { DistributeWizard } from "./DistributeWizard";

export function PoolPanel({
  roomCode,
  adminCode,
}: {
  roomCode: string;
  adminCode: string;
}) {
  const room = useQuery(api.rooms.getByCode, { code: roomCode });
  const recordDeposit = useMutation(api.rooms.recordDeposit);
  const endPresentation = useMutation(api.rooms.endPresentation);
  const [amount, setAmount] = useState("0.1");
  const [busy, setBusy] = useState<null | "deposit" | "end">(null);
  const [showWizard, setShowWizard] = useState(false);

  if (!room) return null;

  const onchainAvailable = !!HUNCH_POOL_ADDRESS;
  const deposited = room.poolDepositWei ? BigInt(room.poolDepositWei) : 0n;
  const ended = !!room.endedAt;
  const finalized = !!room.poolFinalized;

  async function onDeposit() {
    const trimmed = amount.trim();
    if (!trimmed || Number(trimmed) <= 0) {
      toast.error("Enter an amount");
      return;
    }
    setBusy("deposit");
    try {
      if (onchainAvailable) {
        const res = await depositToPool(roomCode, trimmed);
        if (!res) {
          // No injected wallet — fall back to simulated.
          const wei = parseEther(trimmed).toString();
          await recordDeposit({
            roomCode,
            adminCode,
            amountWei: wei,
            mode: "simulated",
          });
          toast.success("Deposit recorded (no wallet — simulated)");
        } else {
          await recordDeposit({
            roomCode,
            adminCode,
            amountWei: res.amountWei.toString(),
            txHash: res.txHash,
            mode: "onchain",
          });
          toast.success("Deposited on Monad");
        }
      } else {
        const wei = parseEther(trimmed).toString();
        await recordDeposit({
          roomCode,
          adminCode,
          amountWei: wei,
          mode: "simulated",
        });
        toast.success("Deposit recorded (simulated)");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onEnd() {
    setBusy("end");
    try {
      await endPresentation({ roomCode, adminCode });
      toast.success("Presentation ended — distribute the pool");
      setShowWizard(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const mode = room.poolMode ?? (onchainAvailable ? "onchain" : "simulated");
  const isSim = mode === "simulated";

  return (
    <>
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm uppercase tracking-widest text-white/40">
            Prize pool
          </h3>
          {isSim && (
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200">
              simulated
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black tabular-nums">
            {formatEther(deposited)}
          </span>
          <span className="text-white/40 text-sm">MON pooled</span>
        </div>

        {finalized ? (
          <div className="text-sm text-emerald-300">
            ✓ Pool finalized
            {room.poolFinalizeTxHash && (
              <a
                className="ml-2 text-brand-500 hover:underline"
                href={explorerTxUrl(room.poolFinalizeTxHash)}
                target="_blank"
                rel="noreferrer"
              >
                tx ↗
              </a>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.1"
                className="flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-brand-500 font-mono"
              />
              <button
                onClick={onDeposit}
                disabled={busy !== null}
                className="px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-sm font-semibold disabled:opacity-50"
              >
                {busy === "deposit" ? "…" : "Deposit"}
              </button>
            </div>

            {ended ? (
              <button
                onClick={() => setShowWizard(true)}
                className="rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 py-2.5 font-bold"
              >
                Distribute pool →
              </button>
            ) : (
              <button
                onClick={onEnd}
                disabled={busy !== null || deposited === 0n}
                className="rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 py-2.5 font-semibold text-sm"
                title={
                  deposited === 0n
                    ? "Deposit something first"
                    : "End presentation and pick winners"
                }
              >
                {busy === "end" ? "…" : "End presentation & distribute"}
              </button>
            )}
          </>
        )}

        {room.poolDepositTxHash && (
          <a
            href={explorerTxUrl(room.poolDepositTxHash)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-500 hover:underline"
          >
            last deposit tx ↗
          </a>
        )}
      </div>

      {showWizard && (
        <DistributeWizard
          roomCode={roomCode}
          adminCode={adminCode}
          depositedWei={deposited}
          mode={mode}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
