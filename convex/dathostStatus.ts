import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const checkServerStatus = internalAction({
  args: {
    dathostMatchId: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("DatHost credentials not configured");
      return { error: "No credentials" };
    }

    const auth = btoa(`${username}:${password}`);

    try {
      console.log("🔍 Checking DatHost CS2 match status:", args.dathostMatchId);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/cs2-matches/${args.dathostMatchId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to get match status:", response.statusText);
        return { error: response.statusText };
      }

      const matchData = await response.json();
      
      console.log("📊 CS2 Match FULL DATA:", JSON.stringify(matchData, null, 2));
      
      // FASE 21: INSTANT PLAYER DETECTION via Status Object
      const team1Stats = matchData.team1_stats;
      const team2Stats = matchData.team2_stats;
      const playerAConnected = team1Stats && team1Stats.players && team1Stats.players.length > 0;
      const playerBConnected = team2Stats && team2Stats.players && team2Stats.players.length > 0;
      
      if (playerAConnected && playerBConnected) {
        const now = new Date().toISOString();
        console.log(`⚡ [${now}] INSTANT DETECTION: Both players detected in status object!`);
        console.log(`📊 Team1 Players:`, team1Stats.players.map((p: any) => p.steam_id));
        console.log(`📊 Team2 Players:`, team2Stats.players.map((p: any) => p.steam_id));
      }
      
      // FASE 21: FORCE LIVE RECOVERY - If game already started but we're not LIVE
      const scoreA = team1Stats?.score || 0;
      const scoreB = team2Stats?.score || 0;
      const hasLiveScores = scoreA > 0 || scoreB > 0;
      
      if (hasLiveScores) {
        console.log(`⚡ LIVE SCORES DETECTED: ${scoreA} - ${scoreB}`);
        await ctx.runMutation(internal.dathostStatus.forceLiveRecovery, {
          matchId: args.matchId,
          scoreA,
          scoreB,
          team1Stats,
          team2Stats,
        });
        return { success: true, forcedLive: true };
      }
      
      // Count connected players from players array
      let playersOnline = 0;
      if (matchData.players && Array.isArray(matchData.players)) {
        playersOnline = matchData.players.filter((p: any) => p.connected === true).length;
        console.log(`👥 Players connected: ${playersOnline}/${matchData.players.length}`);
        console.log(`📊 Players:`, matchData.players.map((p: any) => ({
          steam_id_64: p.steam_id_64,
          team: p.team,
          connected: p.connected
        })));
      }
      
      // Check for all_players_connected event
      const allPlayersConnectedEvent = matchData.events?.find((e: any) => e.event === "all_players_connected");
      if (allPlayersConnectedEvent) {
        console.log("✅ ALL_PLAYERS_CONNECTED event detected at:", allPlayersConnectedEvent.timestamp);
      }
      
      console.log(`👥 Final connected player count: ${playersOnline}`);
      
      // Update match with player count
      await ctx.runMutation(internal.dathostStatus.updatePlayerCount, {
        matchId: args.matchId,
        playersOnline,
      });
      
      return {
        success: true,
        playersOnline,
        allPlayersConnected: !!allPlayersConnectedEvent,
      };
    } catch (error: any) {
      console.error("Error checking server status:", error.message);
      return { error: error.message };
    }
  },
});

export const updatePlayerCount = internalMutation({
  args: {
    matchId: v.id("matches"),
    playersOnline: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);

    if (!match) return;

    const expectedPlayers = match.mode === "1v1" ? 2 : 10;
    
    console.log(`🎮 Match ${args.matchId}: ${args.playersOnline}/${expectedPlayers} players in server`);

    // SINGLE SOURCE OF TRUTH: DatHost API detected all players online
    if (args.playersOnline >= expectedPlayers && match.state === "WARMUP") {
      const now = new Date().toISOString();
      console.log(`✅ [${now}] DATHOST API: All ${args.playersOnline}/${expectedPlayers} players ONLINE!`);
      
      // Get all player stats
      const stats = await ctx.db
        .query("player_stats")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect();

      console.log(`📊 [DATHOST] Found ${stats.length} player stats in DB`);

      // Mark all as connected (idempotent - safe to call multiple times)
      let newlyConnected = 0;
      for (const stat of stats) {
        if (!stat.connected) {
          await ctx.db.patch(stat._id, {
            connected: true,
          });
          newlyConnected++;
        }
      }
      
      if (newlyConnected > 0) {
        console.log(`✅ [DATHOST] Marked ${newlyConnected} players as connected`);
      }

      // SINGLE TRIGGER: Call checkLobbyReady ONCE
      // The countdownStarted flag will prevent duplicate countdowns
      console.log(`🚀 [DATHOST] Triggering checkLobbyReady NOW...`);
      await ctx.scheduler.runAfter(0, internal.lobbyReady.checkLobbyReady, {
        matchId: args.matchId,
      });
    }
  },
});

/**
 * FASE 21: FORCE LIVE RECOVERY
 * If DatHost status object shows live scores but match is not LIVE,
 * force transition and sync state immediately
 */
export const forceLiveRecovery = internalMutation({
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

    // Only force if not already LIVE
    if (match.state === "LIVE") {
      // Just update scores if already LIVE
      if (match.scoreTeamA !== args.scoreA || match.scoreTeamB !== args.scoreB) {
        await ctx.db.patch(args.matchId, {
          scoreTeamA: args.scoreA,
          scoreTeamB: args.scoreB,
        });
        console.log(`✅ [SYNC] Updated scores: ${args.scoreA} - ${args.scoreB}`);
      }
      
      // Update player stats in real-time
      await updatePlayerStatsRealtime(ctx, args.matchId, args.team1Stats, args.team2Stats, match);
      return;
    }

    // FORCE LIVE if game already started
    const now = new Date().toISOString();
    console.log(`⚡ [${now}] SYNC: Game detected in progress via Status Object. Forcing LIVE state.`);
    console.log(`📊 [SYNC] Scores: Team A ${args.scoreA} - Team B ${args.scoreB}`);

    const startTime = Date.now();
    await ctx.db.patch(args.matchId, {
      state: "LIVE",
      scoreTeamA: args.scoreA,
      scoreTeamB: args.scoreB,
      startTime: BigInt(startTime),
      currentRound: Math.max(args.scoreA, args.scoreB),
    });

    console.log(`✅ [SYNC] Match forced to LIVE at ${new Date(startTime).toISOString()}`);

    // Start live match polling
    await ctx.scheduler.runAfter(0, internal.liveMatchPolling.startLiveMatchPolling, {
      matchId: args.matchId,
    });

    // Update player stats in real-time
    await updatePlayerStatsRealtime(ctx, args.matchId, args.team1Stats, args.team2Stats, match);
  },
});

/**
 * FASE 21: REAL-TIME STATS UPDATE
 * Update kills/deaths/assists from DatHost status object immediately
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
        
        console.log(`📊 [SYNC] Updated stats for ${user.steamName || user.clerkId}: ${playerData.kills}K/${playerData.deaths}D/${playerData.assists}A`);
      }
    }
  }
}
