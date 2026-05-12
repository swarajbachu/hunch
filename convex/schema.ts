import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    code: v.string(),
    name: v.string(),
    adminCode: v.string(),
    adminAddress: v.union(v.string(), v.null()),
    createdAt: v.number(),
    poolDepositWei: v.optional(v.string()),
    poolDepositTxHash: v.optional(v.string()),
    poolFinalized: v.optional(v.boolean()),
    poolFinalizeTxHash: v.optional(v.string()),
    poolMode: v.optional(v.union(v.literal("onchain"), v.literal("simulated"))),
    endedAt: v.optional(v.number()),
  }).index("by_code", ["code"]),

  questions: defineTable({
    roomId: v.id("rooms"),
    text: v.string(),
    category: v.optional(v.string()),
    resolved: v.boolean(),
    outcome: v.union(v.literal("YES"), v.literal("NO"), v.null()),
    yesCount: v.number(),
    noCount: v.number(),
    resolveTxHash: v.optional(v.string()),
    createdAt: v.number(),
    startedAt: v.optional(v.number()),
    durationMs: v.optional(v.number()),
  }).index("by_room", ["roomId"]),

  users: defineTable({
    roomId: v.id("rooms"),
    address: v.string(),
    displayName: v.string(),
    points: v.number(),
    totalVotes: v.number(),
    correctVotes: v.number(),
    createdAt: v.number(),
    streak: v.optional(v.number()),
  })
    .index("by_room_and_address", ["roomId", "address"])
    .index("by_room", ["roomId"]),

  votes: defineTable({
    questionId: v.id("questions"),
    roomId: v.id("rooms"),
    userAddress: v.string(),
    side: v.union(v.literal("YES"), v.literal("NO")),
    stake: v.number(),
    awarded: v.boolean(),
    createdAt: v.number(),
    bonus: v.optional(v.number()),
  })
    .index("by_question", ["questionId"])
    .index("by_question_and_user", ["questionId", "userAddress"])
    .index("by_user", ["roomId", "userAddress"]),

  payouts: defineTable({
    roomId: v.id("rooms"),
    userAddress: v.string(),
    displayName: v.string(),
    amountWei: v.string(),
    rank: v.number(),
    points: v.number(),
    claimed: v.boolean(),
    claimedTxHash: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_room", ["roomId"])
    .index("by_room_and_address", ["roomId", "userAddress"]),
});
