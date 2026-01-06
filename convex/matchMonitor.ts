import { v } from "convex/values";
import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

// Start monitoring a match in WARMUP state
export const startMatchMonitoring = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    // Schedule periodic checks every 1 second for IMMEDIATE detection
    await ctx.scheduler.runAfter(1000, internal.matchMonitor.checkMatchStatus, {
      matchId: args.matchId,
    });
    
    console.log("🔍 Started monitoring match (1s interval):", args.matchId);
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
    
    // MEGA ATUALIZAÇÃO: Fast-Track Sync via Status Object
    if (match.dathostMatchId) {
      try {
        await ctx.runAction(internal.matchSync.syncMatchStatus, {
          dathostMatchId: match.dathostMatchId,
          matchId: args.matchId,
        });
      } catch (error: any) {
        console.error("❌ Fast-Track sync failed:", error.message);
      }
    }
    
    // Continue monitoring - schedule next check in 1 second for IMMEDIATE detection
    await ctx.scheduler.runAfter(1000, internal.matchMonitor.checkMatchStatus, {
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

