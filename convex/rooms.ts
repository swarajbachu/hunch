import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

function shortCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function getRoomByCode(ctx: QueryCtx, code: string): Promise<Doc<"rooms"> | null> {
  return await ctx.db
    .query("rooms")
    .withIndex("by_code", (q) => q.eq("code", code.toUpperCase()))
    .unique();
}

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
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
    const id = await ctx.db.insert("rooms", {
      code,
      name: name.trim() || "Hunch room",
      adminCode,
      adminAddress: null,
      createdAt: Date.now(),
    });
    return { roomId: id, code, adminCode };
  },
});

export const getByCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const room = await getRoomByCode(ctx, code);
    if (!room) return null;
    return {
      _id: room._id,
      code: room.code,
      name: room.name,
      adminAddress: room.adminAddress,
      createdAt: room.createdAt,
      poolDepositWei: room.poolDepositWei ?? null,
      poolDepositTxHash: room.poolDepositTxHash ?? null,
      poolFinalized: room.poolFinalized ?? false,
      poolFinalizeTxHash: room.poolFinalizeTxHash ?? null,
      poolMode: room.poolMode ?? null,
      endedAt: room.endedAt ?? null,
    };
  },
});

export const setAdminAddress = mutation({
  args: { code: v.string(), adminCode: v.string(), address: v.string() },
  handler: async (ctx, { code, adminCode, address }) => {
    const room = await getRoomByCode(ctx, code);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    await ctx.db.patch(room._id, { adminAddress: address.toLowerCase() });
  },
});

export const recordDeposit = mutation({
  args: {
    roomCode: v.string(),
    adminCode: v.string(),
    amountWei: v.string(),
    txHash: v.optional(v.string()),
    mode: v.union(v.literal("onchain"), v.literal("simulated")),
  },
  handler: async (ctx, { roomCode, adminCode, amountWei, txHash, mode }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    if (room.poolFinalized) throw new Error("Pool already finalized");

    const prev = BigInt(room.poolDepositWei ?? "0");
    const next = prev + BigInt(amountWei);
    await ctx.db.patch(room._id, {
      poolDepositWei: next.toString(),
      poolDepositTxHash: txHash ?? room.poolDepositTxHash,
      poolMode: mode,
    });
  },
});

export const endPresentation = mutation({
  args: { roomCode: v.string(), adminCode: v.string() },
  handler: async (ctx, { roomCode, adminCode }) => {
    const room = await getRoomByCode(ctx, roomCode);
    if (!room) throw new Error("Room not found");
    if (room.adminCode !== adminCode) throw new Error("Invalid admin code");
    if (room.endedAt) return;
    await ctx.db.patch(room._id, { endedAt: Date.now() });
  },
});
