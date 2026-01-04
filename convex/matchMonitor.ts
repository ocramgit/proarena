import { v } from "convex/values";
import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Start monitoring a match in WARMUP state
export const startMatchMonitoring = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    // Schedule periodic checks every 5 seconds
    await ctx.scheduler.runAfter(5000, internal.matchMonitor.checkMatchStatus, {
      matchId: args.matchId,
    });
    
    console.log("🔍 Started monitoring match:", args.matchId);
  },
});

// Check match status periodically
export const checkMatchStatus = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.runQuery(internal.matchMonitor.getMatchState, {
      matchId: args.matchId,
    });
    
    if (!match) {
      console.log("Match not found, stopping monitoring");
      return;
    }
    
    // Stop monitoring if match is no longer in WARMUP
    if (match.state !== "WARMUP") {
      console.log("Match no longer in WARMUP, stopping monitoring");
      return;
    }
    
    // Debug: Log match details
    console.log("🔍 Match details:", {
      matchId: args.matchId,
      dathostServerId: match.dathostServerId,
      dathostMatchId: match.dathostMatchId,
      serverIp: match.serverIp,
      state: match.state
    });
    
    // Check DatHost CS2 match status to see how many players are connected
    if (match.dathostMatchId) {
      console.log("🔍 Calling DatHost CS2 Match API...");
      const result = await ctx.runAction(internal.dathostStatus.checkServerStatus, {
        dathostMatchId: match.dathostMatchId,
        matchId: args.matchId,
      });
      console.log("📡 DatHost API result:", JSON.stringify(result));
    } else {
      console.log("⚠️ No dathostMatchId found for match:", args.matchId);
      console.log("❌ CRITICAL: Cannot check DatHost API without match ID!");
    }
    
    // Check if match should be LIVE based on time
    const now = Date.now();
    const warmupEndsAt = match.warmupEndsAt ? Number(match.warmupEndsAt) : 0;
    
    // If warmup time has passed, force transition to LIVE
    if (warmupEndsAt > 0 && now >= warmupEndsAt) {
      console.log("⏰ Warmup time expired, forcing transition to LIVE");
      await ctx.runMutation(internal.cs2LogHandlers.handleGameStart, {});
      return;
    }
    
    // Check if all players are connected
    const stats = await ctx.runQuery(internal.matchMonitor.getPlayerStats, {
      matchId: args.matchId,
    });
    
    const connectedCount = stats.filter((s: any) => s.connected).length;
    const expectedPlayers = match.mode === "1v1" ? 2 : 10;
    
    console.log(`🔍 Monitor: ${connectedCount}/${expectedPlayers} players connected, state: ${match.state}`);
    console.log("📊 Player stats:", JSON.stringify(stats.map((s: any) => ({
      userId: s.userId,
      connected: s.connected,
      kills: s.kills,
      deaths: s.deaths
    }))));
    
    // If all players connected and warmup was reduced, check if enough time has passed
    if (connectedCount === expectedPlayers) {
      const timeSinceWarmupStart = now - Number(match.warmupEndsAt || 0) + (5 * 60 * 1000);
      
      // If more than 20 seconds since all players connected, force LIVE
      if (timeSinceWarmupStart > 20000) {
        console.log("⏰ All players connected and warmup timeout reached, forcing LIVE");
        await ctx.runMutation(internal.cs2LogHandlers.handleGameStart, {});
        return;
      }
    }
    
    // DISABLED: Fallback was causing false positives
    // Only rely on DatHost API and CS2 logs for connection detection
    if (stats.length === expectedPlayers && connectedCount === 0) {
      const timeSinceWarmupStart = now - Number(match.warmupEndsAt || 0) + (5 * 60 * 1000);
      
      if (timeSinceWarmupStart > 30000) {
        console.log(`⚠️ No connections detected after 30s. ${connectedCount}/${expectedPlayers} players connected.`);
        console.log("ℹ️ Waiting for DatHost API or CS2 logs to confirm connections...");
        // DO NOT auto-mark as connected - wait for real confirmation
      }
    }
    
    // Continue monitoring - schedule next check in 5 seconds
    await ctx.scheduler.runAfter(5000, internal.matchMonitor.checkMatchStatus, {
      matchId: args.matchId,
    });
  },
});

export const getMatchState = internalQuery({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

export const getPlayerStats = internalQuery({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
  },
});

export const markPlayerConnected = internalMutation({
  args: {
    statId: v.id("player_stats"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.statId, {
      connected: true,
    });
  },
});
