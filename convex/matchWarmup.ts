import { v } from "convex/values";
import { internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";

// Called when server starts - schedules warmup check
export const scheduleWarmupCheck = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;
    
    // Set warmup end time (5 minutes from now)
    const warmupEndsAt = BigInt(Date.now() + 5 * 60 * 1000);
    
    // IMPORTANT: Only update state and warmupEndsAt, preserve serverIp and other fields
    await ctx.db.patch(args.matchId, {
      state: "WARMUP",
      warmupEndsAt,
    });
    
    // Pre-create player_stats for all players in the match
    // This ensures we can track them even if CS2 logs don't arrive
    console.log("🎯 Pre-creating player_stats for all players...");
    const allPlayerIds = [...match.teamA, ...match.teamB];
    
    console.log(`📊 Match mode: ${match.mode}, Expected players: ${allPlayerIds.length}`);
    console.log(`👥 Team A: ${match.teamA.length} players, Team B: ${match.teamB.length} players`);
    
    for (const playerId of allPlayerIds) {
      // Check if stat already exists
      const existingStat = await ctx.db
        .query("player_stats")
        .withIndex("by_user_match", (q) => 
          q.eq("userId", playerId).eq("matchId", args.matchId)
        )
        .first();
      
      if (!existingStat) {
        await ctx.db.insert("player_stats", {
          matchId: args.matchId,
          userId: playerId,
          kills: 0,
          deaths: 0,
          assists: 0,
          mvps: 0,
          connected: false, // Will be set to true when CS2 logs arrive
        });
        console.log("✅ Created player_stat for user:", playerId);
      } else {
        console.log("ℹ️ Player_stat already exists for user:", playerId, "connected:", existingStat.connected);
      }
    }
    
    console.log(`✅ Pre-created/verified stats for ${allPlayerIds.length} players`);
    
    // Schedule check in 5 minutes
    await ctx.scheduler.runAfter(5 * 60 * 1000, internal.matchWarmup.checkWarmupPlayers, {
      matchId: args.matchId,
    });
    
    // Start continuous monitoring
    await ctx.scheduler.runAfter(5000, internal.matchMonitor.startMatchMonitoring, {
      matchId: args.matchId,
    });
    
    console.log("Warmup scheduled for match:", args.matchId);
  },
});

// Stop DatHost server (fail-safe)
export const stopDatHostServer = internalMutation({
  args: {
    serverId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("📡 Scheduling DatHost server stop...");
    await ctx.scheduler.runAfter(0, internal.serverCleanup.stopServer, {
      serverId: args.serverId,
    });
  },
});

// Check if all players connected after warmup period (5 minutes)
export const checkWarmupPlayers = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.runQuery(internal.matchWarmup.getMatchWithStats, {
      matchId: args.matchId,
    });
    
    if (!match) return;
    
    // If already started, ignore
    if (match.state !== "WARMUP") {
      console.log("Match no longer in WARMUP state");
      return;
    }
    
    const expectedPlayers = match.mode === "1v1" ? 2 : 10;
    const connectedCount = match.connectedPlayers || 0;
    
    console.log(`⏰ Warmup timeout (5 minutes) - ${connectedCount}/${expectedPlayers} players connected`);
    
    if (connectedCount >= expectedPlayers) {
      console.log("✅ All players connected - warmup successful");
      return;
    }
    
    // FAIL-SAFE ACTIVATED: Not all players connected
    console.log("❌ FAIL-SAFE: Not all players connected within 5 minutes");
    
    // Stop the DatHost server
    if (match.dathostServerId) {
      console.log("🛑 Stopping DatHost server:", match.dathostServerId);
      await ctx.runAction(internal.serverCleanup.stopServer, {
        serverId: match.dathostServerId,
      });
    }
    
    // Cancel match and apply penalties
    await ctx.runMutation(internal.matchWarmup.cancelMatchAndPenalize, {
      matchId: args.matchId,
      connectedCount,
    });
  },
});

export const getMatchWithStats = internalQuery({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    
    // Count connected players
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    
    const connectedPlayers = stats.filter(s => s.connected).length;
    
    return {
      ...match,
      connectedPlayers,
    };
  },
});

export const cancelMatchAndBanNoShows = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;
    
    // Get all player stats
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    
    // Find players who didn't connect
    const allPlayers = [...match.teamA, ...match.teamB];
    const connectedUserIds = stats.filter(s => s.connected).map(s => s.userId);
    const noShowUserIds = allPlayers.filter(id => !connectedUserIds.includes(id));
    
    console.log("No-show players:", noShowUserIds.length);
    
    // TODO: Ban no-show players (disabled during testing)
    // for (const userId of noShowUserIds) {
    //   await ctx.db.patch(userId, {
    //     isBanned: true,
    //   });
    //   console.log("Banned user for no-show:", userId);
    // }
    console.log("⚠️ Ban system disabled during testing phase");
    
    // Return ELO to players who showed up (if any ELO was deducted)
    // This would be implemented if we deduct ELO on match start
    
    // Cancel the match
    await ctx.db.patch(args.matchId, {
      state: "CANCELLED",
    });
    
    console.log("Match cancelled due to no-shows:", args.matchId);
  },
});

// Cancel match and apply penalties to absent players (PHASE 9 fail-safe)
export const cancelMatchAndPenalize = internalMutation({
  args: {
    matchId: v.id("matches"),
    connectedCount: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;
    
    // Get all player stats
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    
    // Find players who didn't connect
    const allPlayers = [...match.teamA, ...match.teamB];
    const connectedUserIds = stats.filter(s => s.connected).map(s => s.userId);
    const absentPlayerIds = allPlayers.filter(id => !connectedUserIds.includes(id));
    
    console.log(`⚠️ Applying penalties to ${absentPlayerIds.length} absent players`);
    
    // Apply hasAbandoned flag to absent players
    for (const userId of absentPlayerIds) {
      const user = await ctx.db.get(userId);
      if (user) {
        await ctx.db.patch(userId, {
          hasAbandoned: true,
        });
        console.log(`🚫 Flagged user ${userId} for abandonment`);
      }
    }
    
    // Use endgame.cancelMatch to properly cancel and cleanup
    await ctx.scheduler.runAfter(0, internal.endgame.cancelMatch, {
      matchId: args.matchId,
      reason: `Warmup timeout: ${args.connectedCount}/${allPlayers.length} players connected`,
    });
    
    console.log(`❌ Match cancellation scheduled: ${args.connectedCount}/${allPlayers.length} players connected`);
  },
});
