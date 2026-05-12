import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getRoomByCode } from "./rooms";

const STARTING_POINTS = 1000;

export const upsert = mutation({
  args: { roomCode: v.string(), address: v.string(), displayName: v.string() },
  handler: async (ctx, { roomCode, address, displayName }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    const addr = address.toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_room_and_address", (q) => q.eq("roomId", room._id).eq("address", addr))
      .unique();
    if (existing) {
      if (existing.displayName !== displayName) {
        await ctx.db.patch(existing._id, { displayName });
      }
      return existing._id;
    }
    return await ctx.db.insert("users", {
      roomId: room._id,
      address: addr,
      displayName: displayName.trim().slice(0, 32) || "Guest",
      points: STARTING_POINTS,
      totalVotes: 0,
      correctVotes: 0,
      createdAt: Date.now(),
    });
  },
});

export const getMe = query({
  args: { roomCode: v.string(), address: v.string() },
  handler: async (ctx, { roomCode, address }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_room_and_address", (q) =>
        q.eq("roomId", room._id).eq("address", address.toLowerCase())
      )
      .unique();
    return user;
  },
});
