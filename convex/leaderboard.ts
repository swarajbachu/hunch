import { v } from "convex/values";
import { query } from "./_generated/server";
import { getRoomByCode } from "./rooms";

export const topByRoom = query({
  args: { roomCode: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { roomCode, limit }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) return [];
    const users = await ctx.db
      .query("users")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    users.sort((a, b) => b.points - a.points);
    return users.slice(0, limit ?? 10).map((u) => ({
      address: u.address,
      displayName: u.displayName,
      points: u.points,
      totalVotes: u.totalVotes,
      correctVotes: u.correctVotes,
    }));
  },
});
