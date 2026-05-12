import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

function shortCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function hexAddr(rng: () => number): string {
  let out = "0x";
  for (let i = 0; i < 40; i++) {
    out += Math.floor(rng() * 16).toString(16);
  }
  return out;
}

// 16 NPCs ranked by "skill" (probability of voting with the eventual outcome).
// Producing a believable point distribution from clear top to clear bottom.
const NPC_ROSTER: Array<{ name: string; skill: number }> = [
  { name: "Satoshi", skill: 0.95 },
  { name: "Vitalik", skill: 0.92 },
  { name: "Anatoly", skill: 0.88 },
  { name: "Hayden", skill: 0.84 },
  { name: "Stani", skill: 0.78 },
  { name: "Mira", skill: 0.72 },
  { name: "Camila", skill: 0.68 },
  { name: "Kai", skill: 0.62 },
  { name: "Ava", skill: 0.58 },
  { name: "Rune", skill: 0.52 },
  { name: "Lina", skill: 0.48 },
  { name: "Nakamoto", skill: 0.45 },
  { name: "Yuki", skill: 0.4 },
  { name: "Ono", skill: 0.36 },
  { name: "Ren", skill: 0.32 },
  { name: "Zora", skill: 0.28 },
];

type Phase = "resolved" | "locked" | "active" | "draft";

const QUESTION_SPECS: Array<{
  text: string;
  category: string;
  phase: Phase;
  outcome?: "YES" | "NO";
  startedSecsAgo?: number;
  durationSecs?: number;
  voterCount?: number;
  yesBias?: number;
}> = [
  {
    text: "Will this demo work on the first try?",
    category: "demo",
    phase: "resolved",
    outcome: "YES",
    startedSecsAgo: 420,
    durationSecs: 30,
  },
  {
    text: "Will judges ask about Monad's parallel EVM?",
    category: "judges",
    phase: "resolved",
    outcome: "NO",
    startedSecsAgo: 320,
    durationSecs: 30,
  },
  {
    text: "Will the host say 'AI' in the next 30 seconds?",
    category: "meta",
    phase: "resolved",
    outcome: "YES",
    startedSecsAgo: 220,
    durationSecs: 30,
  },
  {
    text: "Will we hit 20+ players in this room tonight?",
    category: "vibes",
    phase: "locked",
    startedSecsAgo: 50,
    durationSecs: 30,
    voterCount: 13,
    yesBias: 0.65,
  },
  {
    text: "Will someone on stage mention 'quadratic funding'?",
    category: "meta",
    phase: "active",
    startedSecsAgo: 6,
    durationSecs: 45,
    voterCount: 9,
    yesBias: 0.55,
  },
  {
    text: "Will Q&A run past 6 minutes?",
    category: "vibes",
    phase: "draft",
    durationSecs: 30,
  },
];

const STARTING_POINTS = 1000;
const STAKE = 100;
const WIN_PAYOUT = 200;
const SPEED_BONUS = 25;
const SPEED_RANK = 3;

type Npc = {
  id: Id<"users">;
  address: string;
  name: string;
  skill: number;
  points: number;
  total: number;
  correct: number;
  streak: number;
};

export const populateDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const rng = makeRng(Math.floor(Math.random() * 1e9));

    // 1. Room
    let code = shortCode();
    for (let i = 0; i < 5; i++) {
      const existing = await ctx.db
        .query("rooms")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
      if (!existing) break;
      code = shortCode();
    }
    const adminCode = shortCode();
    const roomId = await ctx.db.insert("rooms", {
      code,
      name: "Monad Blitz Demo",
      adminCode,
      adminAddress: null,
      createdAt: now - 600_000,
    });

    // 2. NPC users
    const npcs: Npc[] = [];
    for (let i = 0; i < NPC_ROSTER.length; i++) {
      const npc = NPC_ROSTER[i];
      const address = hexAddr(rng);
      const id = await ctx.db.insert("users", {
        roomId,
        address,
        displayName: npc.name,
        points: STARTING_POINTS,
        totalVotes: 0,
        correctVotes: 0,
        streak: 0,
        createdAt: now - 500_000 - i * 1000,
      });
      npcs.push({
        id,
        address,
        name: npc.name,
        skill: npc.skill,
        points: STARTING_POINTS,
        total: 0,
        correct: 0,
        streak: 0,
      });
    }

    // 3. Questions + votes
    for (const spec of QUESTION_SPECS) {
      const createdAt = now - (spec.startedSecsAgo ?? 600) * 1000 - 5000;
      const startedAt =
        spec.phase === "draft"
          ? undefined
          : now - (spec.startedSecsAgo ?? 30) * 1000;
      const durationMs = (spec.durationSecs ?? 30) * 1000;
      const resolved = spec.phase === "resolved";
      const outcome = resolved ? spec.outcome ?? "YES" : null;

      const qId = await ctx.db.insert("questions", {
        roomId,
        text: spec.text,
        category: spec.category,
        resolved,
        outcome,
        yesCount: 0,
        noCount: 0,
        createdAt,
        startedAt,
        durationMs,
      });

      if (spec.phase === "draft") continue;

      // Voter selection
      let voters: Npc[];
      if (resolved) {
        voters = npcs.slice(); // everyone votes on resolved
      } else {
        const count = Math.min(spec.voterCount ?? 8, npcs.length);
        voters = npcs.slice().sort(() => rng() - 0.5).slice(0, count);
      }

      const voteRecords: Array<{
        npc: Npc;
        side: "YES" | "NO";
        createdAt: number;
      }> = [];

      const voteWindow = Math.min(durationMs * 0.85, 25_000);
      const windowStart = startedAt ?? createdAt;

      let yes = 0;
      let no = 0;
      for (const npc of voters) {
        let side: "YES" | "NO";
        if (resolved && outcome) {
          // skill-weighted: NPC votes correctly with prob = skill
          side = rng() < npc.skill ? outcome : outcome === "YES" ? "NO" : "YES";
        } else {
          const bias = spec.yesBias ?? 0.5;
          side = rng() < bias ? "YES" : "NO";
        }
        if (side === "YES") yes++;
        else no++;
        const voteAt = windowStart + Math.floor(rng() * voteWindow);
        voteRecords.push({ npc, side, createdAt: voteAt });
        npc.points -= STAKE;
        npc.total += 1;
      }

      voteRecords.sort((a, b) => a.createdAt - b.createdAt);

      if (resolved && outcome) {
        const correctOrdered = voteRecords.filter((v) => v.side === outcome);
        for (const rec of voteRecords) {
          const won = rec.side === outcome;
          const prevStreak = rec.npc.streak;
          const newStreak = won ? prevStreak + 1 : 0;
          let multiplier = 1;
          if (won) {
            if (newStreak >= 5) multiplier = 2;
            else if (newStreak >= 3) multiplier = 1.5;
          }
          const speedIndex = won ? correctOrdered.indexOf(rec) : -1;
          const speedBonus =
            won && speedIndex >= 0 && speedIndex < SPEED_RANK ? SPEED_BONUS : 0;
          const payout = won ? Math.round(WIN_PAYOUT * multiplier) + speedBonus : 0;
          rec.npc.points += payout;
          if (won) rec.npc.correct += 1;
          rec.npc.streak = newStreak;

          await ctx.db.insert("votes", {
            questionId: qId,
            roomId,
            userAddress: rec.npc.address,
            side: rec.side,
            stake: STAKE,
            awarded: true,
            createdAt: rec.createdAt,
            bonus: payout > 0 ? payout - WIN_PAYOUT : 0,
          });
        }
      } else {
        for (const rec of voteRecords) {
          await ctx.db.insert("votes", {
            questionId: qId,
            roomId,
            userAddress: rec.npc.address,
            side: rec.side,
            stake: STAKE,
            awarded: false,
            createdAt: rec.createdAt,
          });
        }
      }

      await ctx.db.patch(qId, { yesCount: yes, noCount: no });
    }

    // Flush NPC stats
    for (const npc of npcs) {
      await ctx.db.patch(npc.id, {
        points: npc.points,
        totalVotes: npc.total,
        correctVotes: npc.correct,
        streak: npc.streak,
      });
    }

    return {
      code,
      adminCode,
      adminUrl: `/room/${code}/admin?key=${adminCode}`,
      audienceUrl: `/room/${code}`,
      screenUrl: `/room/${code}/screen`,
    };
  },
});

export const wipeDemo = mutation({
  args: {},
  handler: async (ctx) => {
    const rooms = await ctx.db.query("rooms").collect();
    let wiped = 0;
    for (const room of rooms) {
      if (room.name !== "Monad Blitz Demo") continue;
      const qs = await ctx.db
        .query("questions")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const q of qs) {
        const vs = await ctx.db
          .query("votes")
          .withIndex("by_question", (q2) => q2.eq("questionId", q._id))
          .collect();
        for (const v of vs) await ctx.db.delete(v._id);
        await ctx.db.delete(q._id);
      }
      const users = await ctx.db
        .query("users")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const u of users) await ctx.db.delete(u._id);
      const payouts = await ctx.db
        .query("payouts")
        .withIndex("by_room", (q) => q.eq("roomId", room._id))
        .collect();
      for (const p of payouts) await ctx.db.delete(p._id);
      await ctx.db.delete(room._id);
      wiped++;
    }
    return { wipedRooms: wiped };
  },
});
