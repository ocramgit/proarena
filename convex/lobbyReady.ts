import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Track unique connected players for a match
export const checkLobbyReady = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.state !== "WARMUP") {
      return { ready: false };
    }

    // Get all player stats to count connected players
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    const connectedPlayers = stats.filter(s => s.connected);
    const expectedPlayers = match.mode === "1v1" ? 2 : 10;

    console.log(`🎮 Lobby Ready Check: ${connectedPlayers.length}/${expectedPlayers} players connected`);
    console.log(`📊 Player stats details:`, stats.map(s => ({
      userId: s.userId,
      connected: s.connected,
      kills: s.kills,
      deaths: s.deaths
    })));

    // ALL PLAYERS CONNECTED - READY TO START
    if (connectedPlayers.length === expectedPlayers) {
      console.log("✅ ALL PLAYERS CONNECTED! Initiating countdown sequence...");

      // PROTECTION: Check if countdown already started (prevent duplicate calls)
      if (match.countdownStarted) {
        console.log("⚠️ Countdown already started, skipping duplicate call");
        return { ready: true, connectedCount: connectedPlayers.length, alreadyStarted: true };
      }

      // Mark countdown as started to prevent duplicates
      await ctx.db.patch(args.matchId, {
        countdownStarted: true,
      });

      // Schedule the countdown sequence
      await ctx.scheduler.runAfter(0, internal.lobbyReady.startCountdown, {
        matchId: args.matchId,
        dathostServerId: match.dathostServerId || "",
      });

      return { ready: true, connectedCount: connectedPlayers.length };
    }

    return { ready: false, connectedCount: connectedPlayers.length };
  },
});

// Start the 10-second countdown sequence
export const startCountdown = internalMutation({
  args: {
    matchId: v.id("matches"),
    dathostServerId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.state !== "WARMUP") {
      console.log("⚠️ Match not in WARMUP state, aborting countdown");
      return;
    }

    console.log("⏱️ Starting 5-second countdown for IMMEDIATE game start...");

    // Step 1: Send RCON command to set warmup time to 5 seconds
    await ctx.scheduler.runAfter(0, internal.lobbyReady.sendCountdownCommand, {
      dathostServerId: args.dathostServerId,
    });

    // Step 2: After 5 seconds, transition to LIVE
    await ctx.scheduler.runAfter(5000, internal.lobbyReady.transitionToLive, {
      matchId: args.matchId,
    });
  },
});

// Send RCON command to DatHost to set mp_warmuptime 5
export const sendCountdownCommand = internalMutation({
  args: {
    dathostServerId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("📡 Sending mp_warmuptime 5 command to DatHost...");
    
    await ctx.scheduler.runAfter(0, internal.cs2Commands.sendWarmupCommand, {
      dathostServerId: args.dathostServerId,
    });
  },
});

// Transition match to LIVE state
export const transitionToLive = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      console.log("⚠️ Match not found");
      return;
    }

    if (match.state !== "WARMUP") {
      console.log("⚠️ Match already transitioned from WARMUP");
      return;
    }

    console.log("🚀 Transitioning match to LIVE state!");

    await ctx.db.patch(args.matchId, {
      state: "LIVE",
      currentRound: 0,
      scoreTeamA: 0,
      scoreTeamB: 0,
    });

    console.log("✅ Match is now LIVE:", args.matchId);
  },
});
