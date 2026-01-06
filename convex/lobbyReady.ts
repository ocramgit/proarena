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

    // ALL PLAYERS CONNECTED - READY TO START
    if (connectedPlayers.length === expectedPlayers) {
      const now = new Date().toISOString();
      console.log(`✅ [${now}] ALL PLAYERS CONNECTED! ${connectedPlayers.length}/${expectedPlayers}`);
      console.log(`📋 [LOBBY READY] Match ID: ${args.matchId}`);
      console.log(`📋 [LOBBY READY] DatHost Server ID: ${match.dathostServerId}`);
      console.log(`📋 [LOBBY READY] Countdown started flag: ${match.countdownStarted}`);

      // PROTECTION: Check if countdown already started (prevent duplicate calls)
      if (match.countdownStarted) {
        console.log("⚠️ Countdown already started, skipping duplicate call");
        return { ready: true, connectedCount: connectedPlayers.length, alreadyStarted: true };
      }

      // Mark countdown as started to prevent duplicates
      console.log("🔒 [LOBBY READY] Setting countdownStarted flag to TRUE");
      await ctx.db.patch(args.matchId, {
        countdownStarted: true,
      });

      // Schedule the countdown sequence
      console.log("🚀 [LOBBY READY] Scheduling startCountdown NOW (runAfter 0ms)");
      await ctx.scheduler.runAfter(0, internal.lobbyReady.startCountdown, {
        matchId: args.matchId,
        dathostServerId: match.dathostServerId || "",
      });
      
      console.log("✅ [LOBBY READY] Countdown sequence initiated successfully!");

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

    const now = new Date().toISOString();
    console.log(`⏱️ [${now}] START COUNTDOWN CALLED!`);
    console.log(`📋 [START COUNTDOWN] Match ID: ${args.matchId}`);
    console.log(`📋 [START COUNTDOWN] DatHost Server ID: ${args.dathostServerId}`);

    // Send commands to CS2 server
    if (!args.dathostServerId) {
      console.error("❌ [COUNTDOWN] No dathostServerId provided! Cannot send commands!");
      return;
    }
    
    console.log("📡 [START COUNTDOWN] Sending RCON commands to CS2 server...");

    // 1. Send chat message - DISABLED (user request)
    // await ctx.scheduler.runAfter(0, internal.cs2Commands.sendChatMessage, {
    //   dathostServerId: args.dathostServerId,
    //   message: "TODOS OS JOGADORES CONECTADOS. Jogo iniciando em 30 segundos...",
    // });

    // 2. Unlock warmup timer
    await ctx.scheduler.runAfter(0, internal.cs2Commands.sendConsoleCommand, {
      dathostServerId: args.dathostServerId,
      command: "mp_warmup_pausetimer 0",
    });

    // 3. Set warmup time to 10 seconds
    await ctx.scheduler.runAfter(0, internal.cs2Commands.sendConsoleCommand, {
      dathostServerId: args.dathostServerId,
      command: "mp_warmuptime 10",
    });

    // 4. After 10 seconds, transition to LIVE state
    await ctx.scheduler.runAfter(10000, internal.lobbyReady.transitionToLive, {
      matchId: args.matchId,
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

    const startTime = Date.now();
    await ctx.db.patch(args.matchId, {
      state: "LIVE",
      currentRound: 0,
      scoreTeamA: 0,
      scoreTeamB: 0,
      startTime: BigInt(startTime),
    });

    console.log("✅ Match is now LIVE:", args.matchId);
    console.log("⏰ Match started at:", new Date(startTime).toISOString());
    
    // CRITICAL: Start live match polling immediately
    await ctx.scheduler.runAfter(0, internal.liveMatchPolling.startLiveMatchPolling, {
      matchId: args.matchId,
    });
    
    // Send mp_restartgame 1 to start the game
    if (match.dathostServerId) {
      await ctx.scheduler.runAfter(0, internal.cs2Commands.sendRestartGameCommand, {
        dathostServerId: match.dathostServerId,
      });
    } else {
      console.error("❌ [GAME START] No dathostServerId - cannot start game!");
    }
  },
});
