import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const seedQueue = mutation({
  args: {
    count: v.number(),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
  },
  handler: async (ctx, args) => {
    const fakeNames = [
      "ProPlayer", "SniperKing", "HeadshotMaster", "ClutchGod", "AWPer",
      "EntryFragger", "Lurker", "IGL", "Support", "Rifler",
      "Deagler", "NadeKing", "Anchor", "Rotator", "Trader"
    ];

    const inserted = [];

    for (let i = 0; i < args.count; i++) {
      const fakeName = `${fakeNames[i % fakeNames.length]}${Math.floor(Math.random() * 1000)}`;
      const fakeElo = 800 + Math.floor(Math.random() * 1400);
      
      const fakeUserId = await ctx.db.insert("users", {
        clerkId: `fake_${Date.now()}_${i}`,
        steamId: `STEAM_0:1:${1000000 + i}`,
        role: "USER",
        elo_1v1: 1000 + Math.floor(Math.random() * 500),
        elo_5v5: 1000 + Math.floor(Math.random() * 500),
        isBanned: false,
        isPremium: false,
      });

      const queueId = await ctx.db.insert("queue_entries", {
        userId: fakeUserId,
        mode: args.mode,
        joinedAt: BigInt(Date.now() - Math.floor(Math.random() * 60000)),
      });

      inserted.push({ userId: fakeUserId, queueId });
    }

    return {
      success: true,
      inserted: inserted.length,
      message: `Inserted ${inserted.length} fake users into ${args.mode} queue`,
    };
  },
});

export const seed1v1Queue = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if bot already exists
    let botUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), "STEAM_0:1:172374583"))
      .first();

    if (!botUser) {
      // Create bot user
      const botUserId = await ctx.db.insert("users", {
        clerkId: `fake_1v1_bot_${Date.now()}`,
        steamId: "STEAM_0:1:172374583",
        role: "USER",
        elo_1v1: 1000,
        elo_5v5: 1000,
        isBanned: false,
        isPremium: false,
      });
      botUser = await ctx.db.get(botUserId);
    }

    if (!botUser) {
      throw new Error("Failed to create bot user");
    }

    // Add bot to 1v1 queue
    const queueId = await ctx.db.insert("queue_entries", {
      userId: botUser._id,
      mode: "1v1",
      joinedAt: BigInt(Date.now()),
    });

    return {
      success: true,
      message: "Bot adicionado à fila 1v1",
    };
  },
});

export const clearFakeUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const fakeUsers = await ctx.db
      .query("users")
      .filter((q) => q.gte(q.field("clerkId"), "fake_"))
      .collect();

    for (const user of fakeUsers) {
      const queueEntries = await ctx.db
        .query("queue_entries")
        .filter((q) => q.eq(q.field("userId"), user._id))
        .collect();

      for (const entry of queueEntries) {
        await ctx.db.delete(entry._id);
      }

      await ctx.db.delete(user._id);
    }

    return {
      success: true,
      deleted: fakeUsers.length,
      message: `Deleted ${fakeUsers.length} fake users`,
    };
  },
});
