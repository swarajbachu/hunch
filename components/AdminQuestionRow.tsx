"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  HUNCH_CONTRACT_ADDRESS,
  explorerTxUrl,
  recordResolveTx,
} from "@/lib/hunchContract";
import { CountdownRing } from "./CountdownRing";
import { useCountdown } from "@/lib/useCountdown";

const DURATION_PRESETS = [
  { label: "15s", ms: 15_000 },
  { label: "30s", ms: 30_000 },
  { label: "60s", ms: 60_000 },
  { label: "2m", ms: 120_000 },
];

export function AdminQuestionRow({
  roomCode,
  adminCode,
  question,
}: {
  roomCode: string;
  adminCode: string;
  question: {
    _id: Id<"questions">;
    text: string;
    category?: string;
    yesCount: number;
    noCount: number;
    resolved: boolean;
    outcome: "YES" | "NO" | null;
    resolveTxHash?: string;
    startedAt?: number;
    durationMs?: number;
  };
}) {
  const resolve = useMutation(api.questions.resolve);
  const start = useMutation(api.questions.start);
  const setDuration = useMutation(api.questions.setDuration);
  const stopEarly = useMutation(api.questions.stopEarly);
  const [busy, setBusy] = useState<"YES" | "NO" | "START" | "STOP" | null>(null);

  const { expired } = useCountdown(question.startedAt, question.durationMs);
  const total = question.yesCount + question.noCount;
  const yesPct = total > 0 ? Math.round((question.yesCount / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;

  const phase: "draft" | "active" | "locked" | "resolved" = question.resolved
    ? "resolved"
    : !question.startedAt
    ? "draft"
    : expired
    ? "locked"
    : "active";

  async function go(outcome: "YES" | "NO") {
    setBusy(outcome);
    let txHash: string | undefined;
    try {
      if (HUNCH_CONTRACT_ADDRESS) {
        try {
          const hash = await recordResolveTx({
            roomCode,
            questionId: question._id,
            outcome,
            yesCount: question.yesCount,
            noCount: question.noCount,
          });
          if (hash) txHash = hash;
        } catch (e) {
          toast.error("Onchain emit failed — resolving offchain", {
            description: (e as Error).message,
          });
        }
      }
      await resolve({
        roomCode,
        adminCode,
        questionId: question._id,
        outcome,
        txHash,
      });
      toast.success(`Resolved ${outcome}`, {
        description: txHash ? "Logged on Monad" : "Convex only",
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onStart() {
    setBusy("START");
    try {
      await start({ roomCode, adminCode, questionId: question._id });
      toast.success("Question is live");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function onStop() {
    setBusy("STOP");
    try {
      await stopEarly({ roomCode, adminCode, questionId: question._id });
      toast.success("Voting closed");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function pickDuration(ms: number) {
    try {
      await setDuration({ roomCode, adminCode, questionId: question._id, durationMs: ms });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const currentDuration = question.durationMs ?? 30_000;

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        phase === "active"
          ? "bg-emerald-500/[0.06] border-emerald-400/30"
          : phase === "locked"
          ? "bg-amber-500/[0.06] border-amber-400/30"
          : "bg-white/[0.04] border-white/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {question.category && (
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {question.category}
              </span>
            )}
            {phase === "active" && (
              <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-300">
                live · voting open
              </span>
            )}
            {phase === "locked" && (
              <span className="text-[10px] uppercase tracking-widest font-bold text-amber-300">
                time up · resolve now
              </span>
            )}
            {phase === "resolved" && (
              <span
                className={`text-[10px] uppercase tracking-widest font-bold ${
                  question.outcome === "YES" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                resolved {question.outcome}
              </span>
            )}
          </div>
          <p className="font-semibold">{question.text}</p>
          <div className="mt-2 text-xs text-white/50 flex gap-3 flex-wrap">
            <span className="text-emerald-300">YES {question.yesCount} ({yesPct}%)</span>
            <span className="text-rose-300">NO {question.noCount} ({noPct}%)</span>
            {question.resolveTxHash && (
              <a
                href={explorerTxUrl(question.resolveTxHash)}
                target="_blank"
                rel="noreferrer"
                className="text-brand-500 hover:underline"
              >
                view on Monad ↗
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {phase === "active" && (
            <CountdownRing
              startedAt={question.startedAt}
              durationMs={question.durationMs}
              size={56}
            />
          )}
        </div>
      </div>

      {phase === "draft" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-white/40 mr-1">duration</span>
          {DURATION_PRESETS.map((p) => (
            <button
              key={p.ms}
              onClick={() => pickDuration(p.ms)}
              className={`px-2.5 py-1 rounded-full text-xs border ${
                currentDuration === p.ms
                  ? "bg-brand-600 border-brand-500"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={onStart}
            disabled={busy !== null}
            className="ml-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-sm disabled:opacity-50"
          >
            {busy === "START" ? "…" : "▶ Start"}
          </button>
        </div>
      )}

      {phase === "active" && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={onStop}
            disabled={busy !== null}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white/60 border border-white/10"
          >
            {busy === "STOP" ? "…" : "Stop early"}
          </button>
        </div>
      )}

      {phase === "locked" && (
        <div className="mt-3 flex gap-2 justify-end">
          <button
            onClick={() => go("YES")}
            disabled={busy !== null}
            className="px-3 py-2 rounded-lg bg-emerald-500/30 border border-emerald-400/50 text-emerald-100 text-sm font-bold hover:bg-emerald-500/40 disabled:opacity-50"
          >
            {busy === "YES" ? "…" : "Resolve YES"}
          </button>
          <button
            onClick={() => go("NO")}
            disabled={busy !== null}
            className="px-3 py-2 rounded-lg bg-rose-500/30 border border-rose-400/50 text-rose-100 text-sm font-bold hover:bg-rose-500/40 disabled:opacity-50"
          >
            {busy === "NO" ? "…" : "Resolve NO"}
          </button>
        </div>
      )}
    </div>
  );
}
