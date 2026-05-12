"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";

const CATEGORIES = ["demo", "judges", "meta", "vibes"];

export function AdminQuestionForm({
  roomCode,
  adminCode,
}: {
  roomCode: string;
  adminCode: string;
}) {
  const create = useMutation(api.questions.create);
  const [text, setText] = useState("");
  const [category, setCategory] = useState<string>("demo");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (text.trim().length < 4) {
      toast.error("Write a real question");
      return;
    }
    setBusy(true);
    try {
      await create({ roomCode, adminCode, text, category });
      setText("");
      toast.success("Question pushed live");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 flex flex-col gap-3">
      <h2 className="font-semibold">Ask the room</h2>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Will this demo work on the first try?"
        className="resize-none rounded-xl bg-black/40 border border-white/10 px-4 py-3 outline-none focus:border-brand-500"
      />
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              category === c
                ? "bg-brand-600 border-brand-500"
                : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <button
        onClick={submit}
        disabled={busy}
        className="rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 py-2.5 font-semibold"
      >
        {busy ? "Posting…" : "Push question →"}
      </button>
    </div>
  );
}
