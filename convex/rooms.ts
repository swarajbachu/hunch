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
