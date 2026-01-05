import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// PHASE 11 SPECIAL: Simplified 1v1 only queue (no parties)
export const joinQueue = mutation({
  args: {
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
  },
  handler: async (ctx, args) => {
    // Force 1v1 for Phase 11 Special
    if (args.mode !== "1v1") {
      throw new Error("Only 1v1 mode available in Phase 11 Special");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (user.isBanned) {
      throw new Error("You are banned from playing");
    }

    if (!user.steamId || user.steamId === "") {
      throw new Error("Steam ID required. Please add it in your profile.");
    }

    // Check if already in queue
    const existingQueueEntry = await ctx.db
      .query("queue_entries")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingQueueEntry) {
      return existingQueueEntry._id;
    }

    // Check if already in active match
    const activeMatch = await ctx.db
      .query("matches")
      .filter((q) =>
        q.or(
          q.eq(q.field("state"), "VETO"),
          q.eq(q.field("state"), "CONFIGURING"),
          q.eq(q.field("state"), "WARMUP"),
          q.eq(q.field("state"), "LIVE")
        )
      )
      .collect();

    const isInActiveMatch = activeMatch.some(
      (match) =>
        match.teamA.includes(user._id) || match.teamB.includes(user._id)
    );

    if (isInActiveMatch) {
      throw new Error("You are already in an active match");
    }

    // Solo 1v1 queue
    const queueId = await ctx.db.insert("queue_entries", {
      userId: user._id,
      mode: "1v1",
      joinedAt: BigInt(Date.now()),
    });

    return queueId;
  },
});

export const leaveQueue = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const queueEntry = await ctx.db
      .query("queue_entries")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (queueEntry) {
      await ctx.db.delete(queueEntry._id);
    }

    return true;
  },
});

export const getQueueStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const queueEntry = await ctx.db
      .query("queue_entries")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (!queueEntry) {
      return null;
    }

    return {
      ...queueEntry,
      waitTime: Number(BigInt(Date.now()) - queueEntry.joinedAt),
    };
  },
});

export const getQueueCount = query({
  args: {
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
  },
  handler: async (ctx, args) => {
    const entries = await ctx.db
      .query("queue_entries")
      .withIndex("by_mode", (q) => q.eq("mode", args.mode))
      .collect();

    return entries.length;
  },
});
