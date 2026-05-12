import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getRoomByCode } from "./rooms";

const WIN_PAYOUT = 200; // stake of 100 already deducted -> net +100
const DEFAULT_DURATION_MS = 30_000;
const SPEED_BONUS = 25; // first 3 correct voters
const SPEED_BONUS_RANK = 3;

export const create = mutation({
  args: {
    roomCode: v.string(),
    adminCode: v.string(),
    text: v.string(),
    category: v.optional(v.string()),
    durationMs: v.optional(v.number()),
  },
  handler: async (ctx, { roomCode, adminCode, text, category, durationMs }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    if (room.endedAt) throw new Error("Presentation already ended");
    return await ctx.db.insert("questions", {
      roomId: room._id,
      text: text.trim(),
      category: category?.trim() || undefined,
      resolved: false,
      outcome: null,
      yesCount: 0,
      noCount: 0,
      createdAt: Date.now(),
      durationMs: durationMs ?? DEFAULT_DURATION_MS,
    });
  },
});

export const setDuration = mutation({
  args: {
    roomCode: v.string(),
    adminCode: v.string(),
    questionId: v.id("questions"),
    durationMs: v.number(),
  },
  handler: async (ctx, { roomCode, adminCode, questionId, durationMs }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    const question = await ctx.db.get(questionId);
    if (!question) throw new Error("Question not found");
    if (question.roomId !== room._id) throw new Error("Question not in room");
    if (question.startedAt) throw new Error("Question already started");
    await ctx.db.patch(questionId, { durationMs });
  },
});

export const start = mutation({
  args: {
    roomCode: v.string(),
    adminCode: v.string(),
    questionId: v.id("questions"),
  },
  handler: async (ctx, { roomCode, adminCode, questionId }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    const question = await ctx.db.get(questionId);
    if (!question) throw new Error("Question not found");
    if (question.roomId !== room._id) throw new Error("Question not in room");
    if (question.startedAt) throw new Error("Already started");
    await ctx.db.patch(questionId, { startedAt: Date.now() });
  },
});

export const stopEarly = mutation({
  args: {
    roomCode: v.string(),
    adminCode: v.string(),
    questionId: v.id("questions"),
  },
  handler: async (ctx, { roomCode, adminCode, questionId }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    const question = await ctx.db.get(questionId);
    if (!question) throw new Error("Question not found");
    if (!question.startedAt) throw new Error("Question hasn't started");
    const elapsed = Date.now() - question.startedAt;
    if (elapsed < 1000) throw new Error("Let it run at least a second");
    await ctx.db.patch(questionId, { durationMs: elapsed });
  },
});

export const listByRoom = query({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) return [];
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .order("asc")
      .collect();
    return questions;
  },
});

export const resolve = mutation({
  args: {
    roomCode: v.string(),
    adminCode: v.string(),
    questionId: v.id("questions"),
    outcome: v.union(v.literal("YES"), v.literal("NO")),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, { roomCode, adminCode, questionId, outcome, txHash }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    const question = await ctx.db.get(questionId);
    if (!question) throw new Error("Question not found");
    if (question.roomId !== room._id) throw new Error("Question not in room");
    if (question.resolved) return;

    await ctx.db.patch(questionId, {
      resolved: true,
      outcome,
      resolveTxHash: txHash,
    });

    const votes = await ctx.db
      .query("votes")
      .withIndex("by_question", (q) => q.eq("questionId", questionId))
      .collect();

    // Speed bonus: first SPEED_BONUS_RANK correct voters get +SPEED_BONUS.
    const correctSortedByTime = votes
      .filter((v) => v.side === outcome)
      .sort((a, b) => a.createdAt - b.createdAt);
    const speedBonusIds = new Set(
      correctSortedByTime.slice(0, SPEED_BONUS_RANK).map((v) => v._id)
    );

    for (const vote of votes) {
      if (vote.awarded) continue;
      const user = await ctx.db
        .query("users")
        .withIndex("by_room_and_address", (q) =>
          q.eq("roomId", room._id).eq("address", vote.userAddress)
        )
        .unique();
      if (!user) continue;
      const won = vote.side === outcome;
      const prevStreak = user.streak ?? 0;
      const newStreak = won ? prevStreak + 1 : 0;
      // Streak multiplier kicks in at 3-in-a-row (1.5x), caps at 2x (5+).
      let multiplier = 1;
      if (won) {
        if (newStreak >= 5) multiplier = 2;
        else if (newStreak >= 3) multiplier = 1.5;
      }
      const speedBonus = won && speedBonusIds.has(vote._id) ? SPEED_BONUS : 0;
      const payout = won ? Math.round(WIN_PAYOUT * multiplier) + speedBonus : 0;

      await ctx.db.patch(user._id, {
        points: user.points + payout,
        correctVotes: user.correctVotes + (won ? 1 : 0),
        streak: newStreak,
      });
      await ctx.db.patch(vote._id, {
        awarded: true,
        bonus: payout > 0 ? payout - WIN_PAYOUT : 0,
      });
    }
  },
});
