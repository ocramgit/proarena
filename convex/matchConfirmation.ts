import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * MATCH CONFIRMATION SYSTEM
 * - Both players must accept within 20 seconds
 * - If one declines: match cancelled, decliner gets 1 min cooldown, accepter returns to queue
 * - If timeout: same as decline
 */

export const confirmMatch = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    if (match.state !== "CONFIRMING") {
      throw new Error("Match is not in confirmation state");
    }

    // Check if user is in this match
    const allPlayers = [...match.teamA, ...match.teamB];
    if (!allPlayers.includes(user._id)) {
      throw new Error("You are not in this match");
    }

    // Check if already accepted
    const acceptedPlayers = match.acceptedPlayers || [];
    if (acceptedPlayers.includes(user._id)) {
      return { success: true, message: "Already confirmed" };
    }

    // Add player to accepted list
    const newAcceptedPlayers = [...acceptedPlayers, user._id];
    await ctx.db.patch(args.matchId, {
      acceptedPlayers: newAcceptedPlayers,
    });

    console.log(`✅ Player ${user._id} confirmed match ${args.matchId}`);

    // Check if all players have accepted
    if (newAcceptedPlayers.length === allPlayers.length) {
      console.log("🎉 All players confirmed! Starting veto phase...");
      await ctx.db.patch(args.matchId, {
        state: "VETO",
      });
    }

    return { success: true, allConfirmed: newAcceptedPlayers.length === allPlayers.length };
  },
});

export const declineMatch = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    if (match.state !== "CONFIRMING") {
      throw new Error("Match is not in confirmation state");
    }

    // Check if user is in this match
    const allPlayers = [...match.teamA, ...match.teamB];
    if (!allPlayers.includes(user._id)) {
      throw new Error("You are not in this match");
    }

    console.log(`❌ Player ${user._id} declined match ${args.matchId}`);

    // Cancel match
    await ctx.db.patch(args.matchId, {
      state: "CANCELLED",
      finishedAt: BigInt(Date.now()),
    });

    // Apply 1 minute cooldown to decliner
    const cooldownUntil = Date.now() + 60 * 1000; // 1 minute from now
    
    // Find decliner's queue entry (if exists)
    const queueEntry = await ctx.db
      .query("queue_entries")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (queueEntry) {
      await ctx.db.patch(queueEntry._id, {
        cooldownUntil: BigInt(cooldownUntil),
      });
    } else {
      // Create a temporary queue entry with cooldown
      await ctx.db.insert("queue_entries", {
        userId: user._id,
        mode: match.mode,
        joinedAt: BigInt(Date.now()),
        cooldownUntil: BigInt(cooldownUntil),
      });
    }

    // Return other players to queue
    const otherPlayers = allPlayers.filter((id) => id !== user._id);
    for (const playerId of otherPlayers) {
      // Check if they already have a queue entry
      const existingEntry = await ctx.db
        .query("queue_entries")
        .withIndex("by_user", (q) => q.eq("userId", playerId))
        .first();

      if (!existingEntry) {
        await ctx.db.insert("queue_entries", {
          userId: playerId,
          mode: match.mode,
          joinedAt: BigInt(Date.now()),
        });
        console.log(`🔄 Player ${playerId} returned to queue`);
      }
    }

    return { success: true, cooldownUntil };
  },
});

// Internal mutation to handle confirmation timeout
export const handleConfirmationTimeout = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    if (match.state !== "CONFIRMING") return;

    console.log(`⏰ Confirmation timeout for match ${args.matchId}`);

    const allPlayers = [...match.teamA, ...match.teamB];
    const acceptedPlayers = match.acceptedPlayers || [];
    const notAcceptedPlayers = allPlayers.filter((id) => !acceptedPlayers.includes(id));

    if (notAcceptedPlayers.length === 0) return; // All confirmed, no timeout

    // Cancel match
    await ctx.db.patch(args.matchId, {
      state: "CANCELLED",
      finishedAt: BigInt(Date.now()),
    });

    const cooldownUntil = Date.now() + 60 * 1000; // 1 minute

    // Apply cooldown to players who didn't accept
    for (const playerId of notAcceptedPlayers) {
      const queueEntry = await ctx.db
        .query("queue_entries")
        .withIndex("by_user", (q) => q.eq("userId", playerId))
        .first();

      if (queueEntry) {
        await ctx.db.patch(queueEntry._id, {
          cooldownUntil: BigInt(cooldownUntil),
        });
      } else {
        await ctx.db.insert("queue_entries", {
          userId: playerId,
          mode: match.mode,
          joinedAt: BigInt(Date.now()),
          cooldownUntil: BigInt(cooldownUntil),
        });
      }
      console.log(`⏱️ Player ${playerId} timed out - 1 min cooldown applied`);
    }

    // Return players who accepted to queue
    for (const playerId of acceptedPlayers) {
      const existingEntry = await ctx.db
        .query("queue_entries")
        .withIndex("by_user", (q) => q.eq("userId", playerId))
        .first();

      if (!existingEntry) {
        await ctx.db.insert("queue_entries", {
          userId: playerId,
          mode: match.mode,
          joinedAt: BigInt(Date.now()),
        });
        console.log(`🔄 Player ${playerId} returned to queue (accepted but match cancelled)`);
      }
    }
  },
});
