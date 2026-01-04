import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const joinQueue = mutation({
  args: {
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("Auth identity:", identity);
    if (!identity) {
      throw new Error("Not authenticated - no identity from ctx.auth.getUserIdentity()");
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

    // Check if user is in a party
    const parties = await ctx.db.query("parties").collect();
    const userParty = parties.find((p) => p.members.includes(user._id));

    if (userParty) {
      // User is in a party - only leader can queue
      if (userParty.leaderId !== user._id) {
        throw new Error("Only the party leader can start the queue");
      }

      // Validate all party members
      for (const memberId of userParty.members) {
        const member = await ctx.db.get(memberId);
        if (!member) {
          throw new Error("Party member not found");
        }
        if (member.isBanned) {
          throw new Error(`Party member ${member.clerkId.substring(0, 10)} is banned`);
        }
        if (!member.steamId || member.steamId === "") {
          throw new Error(`Party member ${member.clerkId.substring(0, 10)} needs to link Steam ID`);
        }
      }

      // Check party size matches mode
      if (args.mode === "5v5" && userParty.members.length > 5) {
        throw new Error("Party too large for 5v5 (max 5 players)");
      }
      if (args.mode === "1v1" && userParty.members.length > 1) {
        throw new Error("Cannot queue 1v1 with a party");
      }
    }

    const existingQueueEntry = await ctx.db
      .query("queue_entries")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existingQueueEntry) {
      return existingQueueEntry._id;
    }

    const activeMatch = await ctx.db
      .query("matches")
      .filter((q) =>
        q.or(
          q.eq(q.field("state"), "VETO"),
          q.eq(q.field("state"), "CONFIGURING"),
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

    // If in party, add all members to queue
    if (userParty) {
      const queueIds = [];
      for (const memberId of userParty.members) {
        const queueId = await ctx.db.insert("queue_entries", {
          userId: memberId,
          mode: args.mode,
          joinedAt: BigInt(Date.now()),
        });
        queueIds.push(queueId);
      }
      return queueIds[0]; // Return leader's queue ID
    } else {
      // Solo queue
      const queueId = await ctx.db.insert("queue_entries", {
        userId: user._id,
        mode: args.mode,
        joinedAt: BigInt(Date.now()),
      });
      return queueId;
    }
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
