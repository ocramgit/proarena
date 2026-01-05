import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { steamId64ToSteamId, steamIdToSteamId64 } from "./steamIdUtils";

export const handlePlayerConnect = internalMutation({
  args: {
    steamId: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🔍 Looking for user with Steam ID:", args.steamId);
    
    // Try to find user with exact Steam ID first
    let user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), args.steamId))
      .first();
    
    // If not found, try converting between formats
    if (!user) {
      console.log("🔄 Trying alternate Steam ID format...");
      
      let alternateSteamId: string;
      if (args.steamId.startsWith("STEAM_0:")) {
        // Convert to SteamID64
        alternateSteamId = steamIdToSteamId64(args.steamId);
      } else {
        // Convert to STEAM_0:1:X format
        alternateSteamId = steamId64ToSteamId(args.steamId);
      }
      
      console.log("🔍 Trying alternate format:", alternateSteamId);
      
      user = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("steamId"), alternateSteamId))
        .first();
    }
    
    if (!user) {
      console.log("⚠️ User not found for Steam ID:", args.steamId, "or its alternate format");
      return;
    }
    
    console.log("✅ Found user:", user._id);
    
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
        
        console.log("✅ Player connected to match:", args.playerName, match._id);
        
        // Check if all players are now connected
        console.log("🔍 Checking if all players connected...");
        const allStats = await ctx.db
          .query("player_stats")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect();
        
        const connectedCount = allStats.filter(s => s.connected).length;
        const expectedPlayers = match.mode === "1v1" ? 2 : 10;
        
        console.log(`Players connected: ${connectedCount}/${expectedPlayers}`);
        
        // Check if lobby is ready to start
        await ctx.scheduler.runAfter(0, internal.lobbyReady.checkLobbyReady, {
          matchId: match._id,
        });
        
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
  },
  handler: async (ctx, args) => {
    console.log("💀 Kill event:", args.killerSteamId, "killed", args.victimSteamId, "with", args.weapon);
    
    // Find users - try both Steam ID formats
    let killer = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), args.killerSteamId))
      .first();
    
    if (!killer) {
      const altKillerId = args.killerSteamId.startsWith("STEAM_0:") 
        ? steamIdToSteamId64(args.killerSteamId)
        : steamId64ToSteamId(args.killerSteamId);
      killer = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("steamId"), altKillerId))
        .first();
    }
    
    let victim = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), args.victimSteamId))
      .first();
    
    if (!victim) {
      const altVictimId = args.victimSteamId.startsWith("STEAM_0:")
        ? steamIdToSteamId64(args.victimSteamId)
        : steamId64ToSteamId(args.victimSteamId);
      victim = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("steamId"), altVictimId))
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
    
    console.log("✅ Found LIVE match:", match._id);
    
    // Update killer stats
    const killerStat = await ctx.db
      .query("player_stats")
      .withIndex("by_user_match", (q) => 
        q.eq("userId", killer._id).eq("matchId", match._id)
      )
      .first();
    
    if (killerStat) {
      await ctx.db.patch(killerStat._id, {
        kills: killerStat.kills + 1,
      });
      console.log(`✅ Updated killer stats: ${killer._id} now has ${killerStat.kills + 1} kills`);
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
      console.log(`✅ Updated victim stats: ${victim._id} now has ${victimStat.deaths + 1} deaths`);
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
    console.log("🏁 Round end event:", args.team, "score:", args.score);
    
    const match = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "LIVE"))
      .first();
    
    if (!match) {
      console.log("⚠️ No LIVE match found for round end event");
      return;
    }
    
    console.log("✅ Found LIVE match:", match._id);
    console.log("📊 Current scores - Team A:", match.scoreTeamA, "Team B:", match.scoreTeamB);
    console.log("🆔 DatHost Server ID:", match.dathostServerId);
    
    // Update score based on team
    let newScoreA = match.scoreTeamA || 0;
    let newScoreB = match.scoreTeamB || 0;
    
    if (args.team === "CT") {
      newScoreA = args.score;
      await ctx.db.patch(match._id, {
        scoreTeamA: newScoreA,
        currentRound: (match.currentRound || 0) + 1,
      });
      console.log(`✅ Updated Team A (CT) score to ${newScoreA}, round ${(match.currentRound || 0) + 1}`);
    } else {
      newScoreB = args.score;
      await ctx.db.patch(match._id, {
        scoreTeamB: newScoreB,
        currentRound: (match.currentRound || 0) + 1,
      });
      console.log(`✅ Updated Team B (T) score to ${newScoreB}, round ${(match.currentRound || 0) + 1}`);
    }
    
    // Check DatHost match status after each round
    if (match.dathostMatchId) {
      console.log("🔍 Checking DatHost match status...");
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
      
      // Log detailed match status every round
      console.log("═══════════════════════════════════════");
      console.log("📊 DATHOST MATCH STATUS");
      console.log("Match ID:", args.dathostMatchId);
      console.log("Finished:", matchData.finished);
      console.log("Team 1 Score:", matchData.team1_stats?.score || 0);
      console.log("Team 2 Score:", matchData.team2_stats?.score || 0);
      console.log("Status:", matchData.status || "unknown");
      console.log("Map:", matchData.map || "unknown");
      console.log("═══════════════════════════════════════");

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
    
    console.log("✅ Game started - Match is now LIVE:", match._id);
    
    // Start DatHost polling for live updates
    await ctx.scheduler.runAfter(0, internal.liveMatchPolling.startLiveMatchPolling, {
      matchId: match._id,
    });
  },
});

// REMOVED - handleGameOverBackup not needed anymore
// Game end is detected by checkDatHostMatchStatus polling
