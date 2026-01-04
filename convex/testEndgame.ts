import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const forceEndGame = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return { error: "Match not found" };
    }

    console.log("🧪 TEST: Forcing game over for match:", args.matchId);
    console.log("Current state:", match.state);
    console.log("Score A:", match.scoreTeamA, "Score B:", match.scoreTeamB);

    // Determine winner based on score
    const scoreA = match.scoreTeamA || 0;
    const scoreB = match.scoreTeamB || 0;
    const winningTeam = scoreA > scoreB ? "teamA" : "teamB";

    console.log("Winner:", winningTeam);

    // Trigger endgame processing
    await ctx.scheduler.runAfter(0, internal.endgame.processGameOver, {
      matchId: args.matchId,
      winningTeam: winningTeam,
    });

    // Trigger server cleanup
    if (match.dathostMatchId) {
      console.log("🗑️ Scheduling DatHost server cleanup");
      await ctx.scheduler.runAfter(5000, internal.endgame.cleanupServer, {
        matchId: args.matchId,
      });
    }

    return { 
      success: true, 
      message: "Endgame processing triggered",
      winningTeam,
      scoreA,
      scoreB
    };
  },
});

export const checkMatchState = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return { error: "Match not found" };
    }

    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    return {
      matchState: match.state,
      scoreTeamA: match.scoreTeamA,
      scoreTeamB: match.scoreTeamB,
      winnerId: match.winnerId,
      mvpId: match.mvpId,
      finishedAt: match.finishedAt,
      playerStats: stats.map(s => ({
        userId: s.userId,
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        mvps: s.mvps,
        eloChange: s.eloChange,
        oldElo: s.oldElo,
        newElo: s.newElo,
      })),
    };
  },
});
