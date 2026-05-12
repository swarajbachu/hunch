"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { formatEther, parseEther } from "viem";
import { api } from "@/convex/_generated/api";
import {
  HUNCH_POOL_ADDRESS,
  depositToPool,
  explorerTxUrl,
  getConnectedAccount,
  pickInjectedAccount,
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
  const [busy, setBusy] = useState<null | "deposit" | "end" | "switch">(null);
  const [showWizard, setShowWizard] = useState(false);
  const [connected, setConnected] = useState<string | null>(null);

  useEffect(() => {
    getConnectedAccount().then((acc) => setConnected(acc));
  }, []);

  if (!room) return null;

  const onchainAvailable = !!HUNCH_POOL_ADDRESS;
  const deposited = room.poolDepositWei ? BigInt(room.poolDepositWei) : 0n;
  const ended = !!room.endedAt;
  const finalized = !!room.poolFinalized;
  const mode = room.poolMode ?? (onchainAvailable ? "onchain" : "simulated");
  const isSim = mode === "simulated";

  async function onSwitchWallet() {
    setBusy("switch");
    try {
      const next = await pickInjectedAccount();
      setConnected(next);
      if (next) toast.success(`Connected ${next.slice(0, 6)}…${next.slice(-4)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

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
          getConnectedAccount().then(setConnected);
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

  return (
    <>
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm uppercase tracking-widest text-white/40">
            Prize pool
          </h3>
          {isSim && (
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-200 shrink-0">
              simulated
            </span>
          )}
        </div>

        {onchainAvailable && (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-white/40 truncate">
              {connected ? (
                <>
                  wallet{" "}
                  <span className="font-mono">
                    {connected.slice(0, 6)}…{connected.slice(-4)}
                  </span>
                </>
              ) : (
                "no wallet connected"
              )}
            </span>
            <button
              onClick={onSwitchWallet}
              disabled={busy !== null}
              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] shrink-0 disabled:opacity-50"
            >
              {busy === "switch"
                ? "…"
                : connected
                ? "Switch wallet"
                : "Connect"}
            </button>
          </div>
        )}

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
            <div className="flex flex-col gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                inputMode="decimal"
                placeholder="0.1"
                className="w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 outline-none focus:border-brand-500 font-mono"
              />
              <button
                onClick={onDeposit}
                disabled={busy !== null}
                className="w-full rounded-xl bg-brand-600 hover:bg-brand-700 py-2.5 font-semibold disabled:opacity-50"
              >
                {busy === "deposit" ? "Depositing…" : `Deposit ${amount || "—"} MON`}
              </button>
            </div>

            <button
              onClick={() => setShowWizard(true)}
              className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-2 text-xs font-semibold text-white/70"
            >
              Preview distribution →
            </button>

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
                disabled={busy !== null}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 disabled:opacity-50 py-2.5 font-bold text-sm"
              >
                {busy === "end" ? "Ending…" : "End presentation & distribute"}
              </button>
            )}
          </>
        )}

        {room.poolDepositTxHash && (
          <a
            href={explorerTxUrl(room.poolDepositTxHash)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-500 hover:underline truncate"
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
          alreadyEnded={ended}
          onClose={() => setShowWizard(false)}
        />
      )}
    </>
  );
}
