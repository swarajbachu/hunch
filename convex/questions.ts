import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getRoomByCode } from "./rooms";

const WIN_PAYOUT = 200; // stake of 100 already deducted -> net +100

export const create = mutation({
  args: {
    roomCode: v.string(),
    adminCode: v.string(),
    text: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { roomCode, adminCode, text, category }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    return await ctx.db.insert("questions", {
      roomId: room._id,
      text: text.trim(),
      category: category?.trim() || undefined,
      resolved: false,
      outcome: null,
      yesCount: 0,
      noCount: 0,
      createdAt: Date.now(),
    });
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
      await ctx.db.patch(user._id, {
        points: user.points + (won ? WIN_PAYOUT : 0),
        correctVotes: user.correctVotes + (won ? 1 : 0),
      });
      await ctx.db.patch(vote._id, { awarded: true });
    }
  },
});
