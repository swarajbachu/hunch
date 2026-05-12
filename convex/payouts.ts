import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getRoomByCode } from "./rooms";

export const recordFinalize = mutation({
  args: {
    roomCode: v.string(),
    adminCode: v.string(),
    txHash: v.optional(v.string()),
    mode: v.union(v.literal("onchain"), v.literal("simulated")),
    payouts: v.array(
      v.object({
        address: v.string(),
        displayName: v.string(),
        amountWei: v.string(),
        rank: v.number(),
        points: v.number(),
      })
    ),
  },
  handler: async (ctx, { roomCode, adminCode, txHash, mode, payouts }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    if (room.poolFinalized) throw new Error("Pool already finalized");

    for (const p of payouts) {
      const addr = p.address.toLowerCase();
      const existing = await ctx.db
        .query("payouts")
        .withIndex("by_room_and_address", (q) =>
          q.eq("roomId", room._id).eq("userAddress", addr)
        )
        .unique();
      if (existing) continue;
      await ctx.db.insert("payouts", {
        roomId: room._id,
        userAddress: addr,
        displayName: p.displayName,
        amountWei: p.amountWei,
        rank: p.rank,
        points: p.points,
        claimed: false,
        createdAt: Date.now(),
      });
    }

    await ctx.db.patch(room._id, {
      poolFinalized: true,
      poolFinalizeTxHash: txHash,
      poolMode: mode,
      endedAt: room.endedAt ?? Date.now(),
    });
  },
});

export const listByRoom = query({
  args: { roomCode: v.string() },
  handler: async (ctx, { roomCode }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) return [];
    const rows = await ctx.db
      .query("payouts")
      .withIndex("by_room", (q) => q.eq("roomId", room._id))
      .collect();
    return rows.slice().sort((a, b) => a.rank - b.rank);
  },
});

export const forUser = query({
  args: { roomCode: v.string(), address: v.string() },
  handler: async (ctx, { roomCode, address }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) return null;
    const row = await ctx.db
      .query("payouts")
      .withIndex("by_room_and_address", (q) =>
        q.eq("roomId", room._id).eq("userAddress", address.toLowerCase())
      )
      .unique();
    return row;
  },
});

export const markClaimed = mutation({
  args: {
    roomCode: v.string(),
    address: v.string(),
    txHash: v.optional(v.string()),
  },
  handler: async (ctx, { roomCode, address, txHash }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    const row = await ctx.db
      .query("payouts")
      .withIndex("by_room_and_address", (q) =>
        q.eq("roomId", room._id).eq("userAddress", address.toLowerCase())
      )
      .unique();
    if (!row) throw new Error("No payout to claim");
    if (row.claimed) return;
    await ctx.db.patch(row._id, { claimed: true, claimedTxHash: txHash });
  },
});
