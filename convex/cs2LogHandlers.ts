import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeSteamId, steamId64ToSteamId, steamIdToSteamId64 } from "./steamIdUtils";

export const handlePlayerConnect = internalMutation({
  args: {
    steamId: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🔍 Player connecting - Raw Steam ID:", args.steamId);
    
    // Normalize the incoming SteamID to SteamID64 format
    const normalizedSteamId = normalizeSteamId(args.steamId);
    console.log("🔄 Normalized to SteamID64:", normalizedSteamId);
    
    // Try to find user with normalized Steam ID
    let user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), normalizedSteamId))
      .first();
    
    // If not found, try original format
    if (!user) {
      console.log("🔍 Trying original format:", args.steamId);
      user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("steamId"), args.steamId))
        .first();
    }
    
    // If still not found, try alternate formats
    if (!user) {
      const alternateSteamId = args.steamId.startsWith("STEAM_") 
        ? steamIdToSteamId64(args.steamId)
        : steamId64ToSteamId(normalizedSteamId);
      
      user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("steamId"), alternateSteamId))
        .first();
    }
      
    if (!user) {
      console.error("❌ [PLAYER CONNECT] User not found:", normalizedSteamId);
      return;
    }
    
    // Find active match for this user
    const matches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "WARMUP"))
      .collect();
    
    for (const match of matches) {
      if (match.teamA.includes(user._id) || match.teamB.includes(user._id)) {
        // Update player stats - mark as connected
        const existingStat = await ctx.db
          .query("player_stats")
          .withIndex("by_user_match", (q) => 
            q.eq("userId", user._id).eq("matchId", match._id)
          )
          .first();
        
        if (existingStat) {
          await ctx.db.patch(existingStat._id, { connected: true });
          
          const now = new Date().toISOString();
          console.log(`✅ [${now}] Player connected: ${args.playerName}`);
          console.log(`📊 [PLAYER CONNECT] Match ID: ${match._id}, State: ${match.state}`);
        } else {
          await ctx.db.insert("player_stats", {
            matchId: match._id,
            userId: user._id,
            kills: 0,
            deaths: 0,
            assists: 0,
            mvps: 0,
            connected: true,
          });
        }
        
        // ASSIGN TEAM IMMEDIATELY AFTER PLAYER CONNECTS
        if (match.dathostServerId) {
          // Check which team the player is on
          const isTeamA = match.teamA.includes(user._id);
          const isTeamB = match.teamB.includes(user._id);
          
          if (isTeamA) {
            await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.assignPlayerTeam, {
              dathostServerId: match.dathostServerId,
              steamId: normalizedSteamId,
              team: 3, // CT
              playerName: args.playerName,
            });
          } else if (isTeamB) {
            await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.assignPlayerTeam, {
              dathostServerId: match.dathostServerId,
              steamId: normalizedSteamId,
              team: 2, // T
              playerName: args.playerName,
            });
          } else {
            console.error(`❌ [TEAM ASSIGN ERROR] ${args.playerName} is NOT in Team A or Team B!`);
            console.error(`❌ [TEAM ASSIGN ERROR] This should NEVER happen!`);
          }
        }
        
        // Check if all players are now connected
        const allStats = await ctx.db
          .query("player_stats")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect();
        
        const connectedCount = allStats.filter(s => s.connected).length;
        const expectedPlayers = match.mode === "1v1" ? 2 : 10;
        
        console.log(`📊 [PLAYER CONNECT] Connected: ${connectedCount}/${expectedPlayers}`);
        console.log(`ℹ️ [PLAYER CONNECT] Player connection logged. DatHost API will handle countdown trigger.`);
        
        break;
      }
    }
  },
});

export const handlePlayerKill = internalMutation({
  args: {
    killerSteamId: v.string(),
    victimSteamId: v.string(),
    weapon: v.string(),
    headshot: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Normalize Steam IDs
    const normalizedKillerId = normalizeSteamId(args.killerSteamId);
    const normalizedVictimId = normalizeSteamId(args.victimSteamId);
    
    // Find users with normalized IDs
    let killer = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), normalizedKillerId))
      .first();
    
    if (!killer) {
      killer = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("steamId"), args.killerSteamId))
        .first();
    }
    
    let victim = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), normalizedVictimId))
      .first();
    
    if (!victim) {
      victim = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("steamId"), args.victimSteamId))
        .first();
    }
    
    if (!killer || !victim) {
      console.log("⚠️ Killer or victim not found:", { killer: !!killer, victim: !!victim });
      return;
    }
    
    // Find active match
    const match = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "LIVE"))
      .first();
    
    if (!match) {
      console.log("⚠️ No LIVE match found for kill event");
      return;
    }
    
    // Update killer stats
    const killerStat = await ctx.db
      .query("player_stats")
      .withIndex("by_user_match", (q) => 
        q.eq("userId", killer._id).eq("matchId", match._id)
      )
      .first();
    
    if (killerStat) {
      const newKills = killerStat.kills + 1;
      const newHeadshots = (killerStat.headshots || 0) + (args.headshot ? 1 : 0);
      const hsPercentage = newKills > 0 ? (newHeadshots / newKills) * 100 : 0;
      
      await ctx.db.patch(killerStat._id, {
        kills: newKills,
        headshots: newHeadshots,
        headshotPercentage: hsPercentage,
      });
    } else {
      console.log("⚠️ Killer stat not found for user:", killer._id);
    }
    
    // Update victim stats
    const victimStat = await ctx.db
      .query("player_stats")
      .withIndex("by_user_match", (q) => 
        q.eq("userId", victim._id).eq("matchId", match._id)
      )
      .first();
    
    if (victimStat) {
      await ctx.db.patch(victimStat._id, {
        deaths: victimStat.deaths + 1,
      });
    } else {
      console.log("⚠️ Victim stat not found for user:", victim._id);
    }
  },
});

export const handlePlayerAssist = internalMutation({
  args: {
    assisterSteamId: v.string(),
  },
  handler: async (ctx, args) => {
    const assister = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), args.assisterSteamId))
      .first();
    
    if (!assister) return;
    
    const match = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "LIVE"))
      .first();
    
    if (!match) return;
    
    const assisterStat = await ctx.db
      .query("player_stats")
      .withIndex("by_user_match", (q) => 
        q.eq("userId", assister._id).eq("matchId", match._id)
      )
      .first();
    
    if (assisterStat) {
      await ctx.db.patch(assisterStat._id, {
        assists: assisterStat.assists + 1,
      });
    }
  },
});

export const handleRoundEnd = internalMutation({
  args: {
    team: v.string(),
    score: v.float64(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "LIVE"))
      .first();
    
    if (!match) {
      console.log("⚠️ No LIVE match found for round end event");
      return;
    }
    
    // Update score based on team
    let newScoreA = match.scoreTeamA || 0;
    let newScoreB = match.scoreTeamB || 0;
    
    if (args.team === "CT") {
      newScoreA = args.score;
      await ctx.db.patch(match._id, {
        scoreTeamA: newScoreA,
        currentRound: (match.currentRound || 0) + 1,
      });
    } else {
      newScoreB = args.score;
      await ctx.db.patch(match._id, {
        scoreTeamB: newScoreB,
        currentRound: (match.currentRound || 0) + 1,
      });
    }
    
    // Check DatHost match status after each round
    if (match.dathostMatchId) {
      await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.checkDatHostMatchStatus, {
        matchId: match._id,
        dathostMatchId: match.dathostMatchId,
      });
    }
  },
});

// Check DatHost match status to see if game is finished
export const checkDatHostMatchStatus = internalAction({
  args: {
    matchId: v.id("matches"),
    dathostMatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("❌ Missing DatHost credentials");
      return;
    }

    const auth = btoa(`${username}:${password}`);

    try {
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
        console.error("Failed to get match status:", response.status);
        return;
      }

      const matchData = await response.json();
      
      // Check if match is finished
      if (matchData.finished === true) {
        console.log("🏁🏁🏁 MATCH IS FINISHED! 🏁🏁🏁");
        
        // Determine winner
        const scoreTeam1 = matchData.team1_stats?.score || 0;
        const scoreTeam2 = matchData.team2_stats?.score || 0;
        const winner = scoreTeam1 > scoreTeam2 ? "team1" : "team2";
        
        console.log("Winner:", winner);
        console.log("Final Score:", scoreTeam1, "-", scoreTeam2);
        
        // Trigger game end
        await ctx.runMutation(internal.matchResults.processMatchResult, {
          dathostMatchId: args.dathostMatchId,
          winner: winner,
          scoreTeam1: scoreTeam1,
          scoreTeam2: scoreTeam2,
        });
      }
    } catch (error) {
      console.error("Error checking DatHost match status:", error);
    }
  },
});

export const handleGameStart = internalMutation({
  args: {},
  handler: async (ctx) => {
    const match = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "WARMUP"))
      .first();
    
    if (!match) {
      console.log("⚠️ No WARMUP match found to transition to LIVE");
      return;
    }
    
    // Transition to LIVE
    await ctx.db.patch(match._id, {
      state: "LIVE",
      currentRound: 0,
      scoreTeamA: 0,
      scoreTeamB: 0,
    });
    
    // Start DatHost polling for live updates
    await ctx.scheduler.runAfter(0, internal.liveMatchPolling.startLiveMatchPolling, {
      matchId: match._id,
    });
  },
});

// Assign player to team via RCON command
// NOTE: Team assignment disabled - requires CounterStrikeSharp plugin
// CS2 vanilla servers will auto-assign teams in 1v1 competitive mode
export const assignPlayerTeam = internalAction({
  args: {
    dathostServerId: v.string(),
    steamId: v.string(),
    team: v.number(), // 2 = T, 3 = CT
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    // Team assignment via css_team requires CounterStrikeSharp plugin
    // Must be installed manually via DatHost Control Panel
    // For now, CS2 handles team assignment automatically in competitive mode
    console.log(`ℹ️ [TEAM ASSIGN] ${args.playerName} → ${args.team === 3 ? 'CT' : 'T'} (auto-assigned by CS2)`);
  },
});

// REMOVED - handleGameOverBackup not needed anymore
// Game end is detected by checkDatHostMatchStatus polling
