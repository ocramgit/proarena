/**
 * FASE 60: MATCH FLOW - WARMUP → COUNTDOWN → LIVE
 * 
 * Orchestrates the match start sequence using RCON commands
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Check if both players are connected
 */
export const checkBothPlayersConnected = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.state !== "WARMUP") return;

    // Get player stats
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    const expectedUserIds = [...match.teamA, ...match.teamB];
    const connectedExpected = stats.filter(
      (s) => s.connected && expectedUserIds.includes(s.userId)
    );
    const expectedPlayers = expectedUserIds.length;

    const connectedUserIds = connectedExpected.map((s) => s.userId);
    const missingUserIds = expectedUserIds.filter((id) => !connectedUserIds.includes(id));

    console.log(`👥 [FLOW] Connected: ${connectedExpected.length}/${expectedPlayers}`);
    if (missingUserIds.length > 0) {
      console.log("⏳ [FLOW] Waiting for users:", missingUserIds);
    }

    if (connectedExpected.length === expectedPlayers) {
      console.log("✅ [FLOW] Both players connected! Starting warmup sequence");

      // Start warmup sequence
      await ctx.scheduler.runAfter(0, internal.matchFlow.startWarmupSequence, {
        matchId: args.matchId,
      });
    }
  },
});

/**
 * Start warmup sequence
 */
export const startWarmupSequence = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.state !== "WARMUP" || !match.dathostServerId) return;
    if (match.countdownStarted) return;

    await ctx.db.patch(args.matchId, {
      countdownStarted: true,
    });

    console.log("🔥 [WARMUP] Starting warmup sequence");

    // Upload Knife plugin files during warmup (3 files: deps.json, dll, pdb)
    console.log("🔪 [WARMUP] Uploading Knife plugin files...");
    await ctx.scheduler.runAfter(0, internal.dathostCore.uploadKnifePlugin, {
      serverId: match.dathostServerId,
    });

    // Send warmup commands
    await ctx.scheduler.runAfter(1000, internal.dathostCore.sendRconCommand, {
      serverId: match.dathostServerId,
      command: "mp_warmuptime 10",
    });

    await ctx.scheduler.runAfter(1500, internal.dathostCore.sendRconCommand, {
      serverId: match.dathostServerId,
      command: "mp_warmup_start",
    });

    await ctx.scheduler.runAfter(2000, internal.dathostCore.sendRconCommand, {
      serverId: match.dathostServerId,
      command: "say >>> MATCH STARTING IN 10 SECONDS <<<",
    });

    // Schedule countdown end (10s warmup + time for upload)
    await ctx.scheduler.runAfter(12000, internal.matchFlow.endWarmupAndGoLive, {
      matchId: args.matchId,
    });
  },
});

/**
 * End warmup and go LIVE
 */
export const endWarmupAndGoLive = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.state !== "WARMUP" || !match.dathostServerId) return;

    console.log("🚀 [LIVE] Ending warmup and going LIVE");

    // End warmup
    await ctx.scheduler.runAfter(0, internal.dathostCore.sendRconCommand, {
      serverId: match.dathostServerId,
      command: "mp_warmup_end",
    });

    // Activate Knife plugin immediately after warmup ends
    await ctx.scheduler.runAfter(500, internal.dathostCore.sendRconCommand, {
      serverId: match.dathostServerId,
      command: "css_plugins load Knife",
    });

    await ctx.scheduler.runAfter(700, internal.dathostCore.sendRconCommand, {
      serverId: match.dathostServerId,
      command: "say [ProArena] Knife plugin activated!",
    });

    await ctx.scheduler.runAfter(1000, internal.dathostCore.sendRconCommand, {
      serverId: match.dathostServerId,
      command: "mp_restartgame 1",
    });

    await ctx.scheduler.runAfter(1500, internal.dathostCore.sendRconCommand, {
      serverId: match.dathostServerId,
      command: "say >>> LIVE <<<",
    });

    // Update match state to LIVE
    await ctx.db.patch(args.matchId, {
      state: "LIVE",
      startTime: BigInt(Date.now()),
    });

    console.log("✅ [LIVE] Match is now LIVE! Knife plugin reloaded.");
  },
});
