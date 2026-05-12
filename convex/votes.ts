import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getRoomByCode } from "./rooms";

const STAKE = 100;

export const submit = mutation({
  args: {
    roomCode: v.string(),
    address: v.string(),
    questionId: v.id("questions"),
    side: v.union(v.literal("YES"), v.literal("NO")),
  },
  handler: async (ctx, { roomCode, address, questionId, side }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    const addr = address.toLowerCase();

    const question = await ctx.db.get(questionId);
    if (!question) throw new Error("Question not found");
    if (question.roomId !== room._id) throw new Error("Question not in room");
    if (question.resolved) throw new Error("Question already resolved");

    const user = await ctx.db
      .query("users")
      .withIndex("by_room_and_address", (q) => q.eq("roomId", room._id).eq("address", addr))
      .unique();
    if (!user) throw new Error("Join the room first");
    if (user.points < STAKE) throw new Error("Not enough points");

    const existing = await ctx.db
      .query("votes")
      .withIndex("by_question_and_user", (q) =>
        q.eq("questionId", questionId).eq("userAddress", addr)
      )
      .unique();
    if (existing) throw new Error("Already voted");

    await ctx.db.insert("votes", {
      questionId,
      roomId: room._id,
      userAddress: addr,
      side,
      stake: STAKE,
      awarded: false,
      createdAt: Date.now(),
    });

    await ctx.db.patch(question._id, {
      yesCount: question.yesCount + (side === "YES" ? 1 : 0),
      noCount: question.noCount + (side === "NO" ? 1 : 0),
    });

    await ctx.db.patch(user._id, {
      points: user.points - STAKE,
      totalVotes: user.totalVotes + 1,
    });
  },
});

export const listByUser = query({
  args: { roomCode: v.string(), address: v.string() },
  handler: async (ctx, { roomCode, address }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) return [];
    return await ctx.db
      .query("votes")
      .withIndex("by_user", (q) =>
        q.eq("roomId", room._id).eq("userAddress", address.toLowerCase())
      )
      .collect();
  },
});
