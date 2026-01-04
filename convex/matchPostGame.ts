import { v } from "convex/values";
import { internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";

export const processFinishedMatch = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    console.log("Processing finished match:", args.matchId);
    
    // Get match data
    const matchData = await ctx.runQuery(internal.matchPostGame.getMatchData, {
      matchId: args.matchId,
    });
    
    if (!matchData) return;
    
    const { match, stats } = matchData;
    
    // Calculate ELO changes
    const K = 32; // ELO K-factor
    const scoreA = match.scoreTeamA || 0;
    const scoreB = match.scoreTeamB || 0;
    const winningTeam = scoreA > scoreB ? "A" : "B";
    
    // Update ELO for all players
    await ctx.runMutation(internal.matchPostGame.updatePlayersElo, {
      matchId: args.matchId,
      winningTeam,
      mode: match.mode,
      kFactor: K,
    });
    
    // Save to match history
    await ctx.runMutation(internal.matchPostGame.saveMatchHistory, {
      matchId: args.matchId,
      mode: match.mode,
      map: match.selectedMap || "unknown",
      teamA: match.teamA,
      teamB: match.teamB,
      winnerId: match.winnerId!,
      scoreTeamA: scoreA,
      scoreTeamB: scoreB,
    });
    
    // Stop and delete the DatHost server
    if (match.dathostServerId) {
      console.log("Deleting DatHost server:", match.dathostServerId);
      try {
        await ctx.runAction(api.dathostCleanup.deleteGameServer, {
          serverId: match.dathostServerId,
        });
      } catch (error) {
        console.error("Failed to delete server:", error);
      }
    }
    
    console.log("Match processing complete:", args.matchId);
  },
});

export const getMatchData = internalQuery({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    
    return { match, stats };
  },
});

export const updatePlayersElo = internalMutation({
  args: {
    matchId: v.id("matches"),
    winningTeam: v.string(),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
    kFactor: v.float64(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;
    
    const winners = args.winningTeam === "A" ? match.teamA : match.teamB;
    const losers = args.winningTeam === "A" ? match.teamB : match.teamA;
    
    // Calculate average ELO
    const winnersElo = await Promise.all(
      winners.map(async (id) => {
        const user = await ctx.db.get(id);
        return args.mode === "1v1" ? user?.elo_1v1 || 1000 : user?.elo_5v5 || 1000;
      })
    );
    
    const losersElo = await Promise.all(
      losers.map(async (id) => {
        const user = await ctx.db.get(id);
        return args.mode === "1v1" ? user?.elo_1v1 || 1000 : user?.elo_5v5 || 1000;
      })
    );
    
    const avgWinnerElo = winnersElo.reduce((a, b) => a + b, 0) / winnersElo.length;
    const avgLoserElo = losersElo.reduce((a, b) => a + b, 0) / losersElo.length;
    
    // Expected score
    const expectedWinner = 1 / (1 + Math.pow(10, (avgLoserElo - avgWinnerElo) / 400));
    const expectedLoser = 1 - expectedWinner;
    
    // ELO change
    const winnerChange = args.kFactor * (1 - expectedWinner);
    const loserChange = args.kFactor * (0 - expectedLoser);
    
    console.log("ELO changes:", { winnerChange, loserChange });
    
    // Update winners
    for (const userId of winners) {
      const user = await ctx.db.get(userId);
      if (!user) continue;
      
      const currentElo = args.mode === "1v1" ? user.elo_1v1 : user.elo_5v5;
      const newElo = currentElo + winnerChange;
      
      if (args.mode === "1v1") {
        await ctx.db.patch(userId, { elo_1v1: newElo });
      } else {
        await ctx.db.patch(userId, { elo_5v5: newElo });
      }
    }
    
    // Update losers
    for (const userId of losers) {
      const user = await ctx.db.get(userId);
      if (!user) continue;
      
      const currentElo = args.mode === "1v1" ? user.elo_1v1 : user.elo_5v5;
      const newElo = currentElo + loserChange;
      
      if (args.mode === "1v1") {
        await ctx.db.patch(userId, { elo_1v1: newElo });
      } else {
        await ctx.db.patch(userId, { elo_5v5: newElo });
      }
    }
  },
});

export const saveMatchHistory = internalMutation({
  args: {
    matchId: v.id("matches"),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
    map: v.string(),
    teamA: v.array(v.id("users")),
    teamB: v.array(v.id("users")),
    winnerId: v.id("users"),
    scoreTeamA: v.float64(),
    scoreTeamB: v.float64(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("match_history", {
      matchId: args.matchId,
      mode: args.mode,
      map: args.map,
      teamA: args.teamA,
      teamB: args.teamB,
      winnerId: args.winnerId,
      scoreTeamA: args.scoreTeamA,
      scoreTeamB: args.scoreTeamB,
      finishedAt: BigInt(Date.now()),
    });
    
    console.log("Match history saved:", args.matchId);
  },
});
