import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * MEGA ATUALIZAÇÃO: SINCRONIZAÇÃO INSTANTÂNEA ("Fast-Track")
 * Usa o Status Object JSON da DatHost para detecção imediata
 * NÃO espera por logs de texto lentos
 */

/**
 * CORE 2.0: CHECK MATCH STATUS (Event-Driven)
 * Chamado pelo matchMonitor a cada 1 segundo
 * Deteta:
 * 1. Jogadores conectados (statsA.steamId + statsB.steamId)
 * 2. Jogo começou (scoreA > 0 || scoreB > 0)
 * 3. Stats em tempo real (kills, deaths, assists)
 */
export const syncMatchStatus = internalAction({
  args: {
    dathostMatchId: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    // Get status object from DatHost
    const statusObject = await ctx.runAction(internal.dathostCore.getMatchStatus, {
      dathostMatchId: args.dathostMatchId,
    });

    if (!statusObject) {
      console.log("⚠️ No status object received");
      return { success: false };
    }

    const match = await ctx.runMutation(internal.matchSync.getMatchState, {
      matchId: args.matchId,
    });

    if (!match) {
      console.log("⚠️ Match not found");
      return { success: false };
    }

    // Extract team stats
    const team1Stats = statusObject.team1_stats;
    const team2Stats = statusObject.team2_stats;

    // INSTANT PLAYER DETECTION
    const playerAConnected = team1Stats?.players?.length > 0;
    const playerBConnected = team2Stats?.players?.length > 0;

    if (playerAConnected && playerBConnected && match.state === "WARMUP") {
      const now = new Date().toISOString();
      console.log(`⚡ [${now}] INSTANT DETECTION: Both players connected!`);
      console.log(`📊 Team1 Players:`, team1Stats.players.map((p: any) => p.steam_id));
      console.log(`📊 Team2 Players:`, team2Stats.players.map((p: any) => p.steam_id));

      // Mark players as connected
      await ctx.runMutation(internal.matchSync.markPlayersConnected, {
        matchId: args.matchId,
      });
    }

    // INSTANT LIVE DETECTION (Fast-Track)
    const scoreA = team1Stats?.score || 0;
    const scoreB = team2Stats?.score || 0;
    const hasLiveScores = scoreA > 0 || scoreB > 0;

    if (hasLiveScores && match.state !== "LIVE") {
      const now = new Date().toISOString();
      console.log(`⚡ [${now}] FAST-TRACK: Game started! Scores: ${scoreA} - ${scoreB}`);
      
      await ctx.runMutation(internal.matchSync.forceLiveState, {
        matchId: args.matchId,
        scoreA,
        scoreB,
        team1Stats,
        team2Stats,
      });

      return { success: true, forcedLive: true };
    }

    // REAL-TIME STATS UPDATE (if already LIVE)
    if (match.state === "LIVE") {
      await ctx.runMutation(internal.matchSync.updateLiveStats, {
        matchId: args.matchId,
        scoreA,
        scoreB,
        team1Stats,
        team2Stats,
      });
    }

    return { success: true };
  },
});

/**
 * Get match state (internal query)
 */
export const getMatchState = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

/**
 * Mark players as connected
 */
export const markPlayersConnected = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const stat of stats) {
      if (!stat.connected) {
        await ctx.db.patch(stat._id, { connected: true });
      }
    }

    console.log(`✅ [SYNC] Marked ${stats.length} players as connected`);
  },
});

/**
 * FORCE LIVE STATE (Fast-Track)
 * Transição imediata para LIVE quando scores aparecem
 */
export const forceLiveState = internalMutation({
  args: {
    matchId: v.id("matches"),
    scoreA: v.float64(),
    scoreB: v.float64(),
    team1Stats: v.any(),
    team2Stats: v.any(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    const now = Date.now();
    console.log(`⚡ [FAST-TRACK] Forcing LIVE state at ${new Date(now).toISOString()}`);

    await ctx.db.patch(args.matchId, {
      state: "LIVE",
      scoreTeamA: args.scoreA,
      scoreTeamB: args.scoreB,
      startTime: BigInt(now),
      currentRound: Math.max(args.scoreA, args.scoreB),
    });

    // Update player stats in real-time
    await updatePlayerStatsRealtime(ctx, args.matchId, args.team1Stats, args.team2Stats, match);

    // Start live match polling
    await ctx.scheduler.runAfter(0, internal.liveMatchPolling.startLiveMatchPolling, {
      matchId: args.matchId,
    });

    console.log(`✅ [FAST-TRACK] Match is now LIVE`);
  },
});

/**
 * UPDATE LIVE STATS (Real-Time)
 * Atualiza scores e K/D/A durante o jogo
 */
export const updateLiveStats = internalMutation({
  args: {
    matchId: v.id("matches"),
    scoreA: v.float64(),
    scoreB: v.float64(),
    team1Stats: v.any(),
    team2Stats: v.any(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    // Update scores if changed
    if (match.scoreTeamA !== args.scoreA || match.scoreTeamB !== args.scoreB) {
      await ctx.db.patch(args.matchId, {
        scoreTeamA: args.scoreA,
        scoreTeamB: args.scoreB,
        currentRound: Math.max(args.scoreA, args.scoreB),
      });
    }

    // Update player stats
    await updatePlayerStatsRealtime(ctx, args.matchId, args.team1Stats, args.team2Stats, match);
  },
});

/**
 * Helper: Update player stats from Status Object
 */
async function updatePlayerStatsRealtime(
  ctx: any,
  matchId: any,
  team1Stats: any,
  team2Stats: any,
  match: any
) {
  if (!team1Stats?.players || !team2Stats?.players) return;

  const allPlayers = [...team1Stats.players, ...team2Stats.players];
  
  for (const playerData of allPlayers) {
    if (!playerData.steam_id) continue;

    const allUserIds = [...match.teamA, ...match.teamB];
    
    for (const userId of allUserIds) {
      const user = await ctx.db.get(userId);
      if (!user || user.steamId !== playerData.steam_id) continue;

      // Find player_stats entry
      const stats = await ctx.db
        .query("player_stats")
        .withIndex("by_match", (q: any) => q.eq("matchId", matchId))
        .filter((q: any) => q.eq(q.field("userId"), userId))
        .first();

      if (stats) {
        // Update stats in real-time
        await ctx.db.patch(stats._id, {
          kills: playerData.kills || 0,
          deaths: playerData.deaths || 0,
          assists: playerData.assists || 0,
          connected: true,
        });
        
        console.log(`📊 [SYNC] ${user.steamName}: ${playerData.kills}K/${playerData.deaths}D/${playerData.assists}A`);
      }
    }
  }
}
