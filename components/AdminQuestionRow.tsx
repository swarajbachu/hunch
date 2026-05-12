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
  };
}) {
  const resolve = useMutation(api.questions.resolve);
  const [busy, setBusy] = useState<"YES" | "NO" | null>(null);

  const total = question.yesCount + question.noCount;
  const yesPct = total > 0 ? Math.round((question.yesCount / total) * 100) : 0;
  const noPct = total > 0 ? 100 - yesPct : 0;

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

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {question.category && (
              <span className="text-[10px] uppercase tracking-widest text-white/40">
                {question.category}
              </span>
            )}
            {question.resolved && (
              <span
                className={`text-[10px] uppercase tracking-widest font-bold ${
                  question.outcome === "YES" ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                Resolved {question.outcome}
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

        {!question.resolved && (
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={() => go("YES")}
              disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-sm font-bold hover:bg-emerald-500/30 disabled:opacity-50"
            >
              {busy === "YES" ? "…" : "Resolve YES"}
            </button>
            <button
              onClick={() => go("NO")}
              disabled={busy !== null}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-400/40 text-rose-200 text-sm font-bold hover:bg-rose-500/30 disabled:opacity-50"
            >
              {busy === "NO" ? "…" : "Resolve NO"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
