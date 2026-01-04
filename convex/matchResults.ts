import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const processMatchResult = internalMutation({
  args: {
    dathostMatchId: v.string(),
    winner: v.string(), // "team1" or "team2"
    scoreTeam1: v.float64(),
    scoreTeam2: v.float64(),
  },
  handler: async (ctx, args) => {
    // Find match by dathostMatchId
    const matches = await ctx.db.query("matches").collect();
    const match = matches.find((m) => m.dathostMatchId === args.dathostMatchId);

    if (!match) {
      console.error("Match not found for DatHost ID:", args.dathostMatchId);
      return { success: false, error: "Match not found" };
    }

    // Determine winner team
    const winningTeam = args.winner === "team1" ? match.teamA : match.teamB;
    const losingTeam = args.winner === "team1" ? match.teamB : match.teamA;

    // Update match with results
    await ctx.db.patch(match._id, {
      state: "FINISHED",
      scoreTeamA: args.scoreTeam1,
      scoreTeamB: args.scoreTeam2,
      winnerId: winningTeam[0], // For now, just use first player as representative
    });

    // Calculate ELO changes
    const K = 32; // ELO K-factor
    const mode = match.mode;

    for (const winnerId of winningTeam) {
      const winner = await ctx.db.get(winnerId);
      if (!winner) continue;

      const currentElo = mode === "1v1" ? winner.elo_1v1 : winner.elo_5v5;
      
      // Calculate average ELO of losing team
      let losingTeamElo = 0;
      let losingTeamCount = 0;
      for (const loserId of losingTeam) {
        const loser = await ctx.db.get(loserId);
        if (loser) {
          losingTeamElo += mode === "1v1" ? loser.elo_1v1 : loser.elo_5v5;
          losingTeamCount++;
        }
      }
      const avgLosingElo = losingTeamCount > 0 ? losingTeamElo / losingTeamCount : currentElo;

      // Expected score
      const expectedScore = 1 / (1 + Math.pow(10, (avgLosingElo - currentElo) / 400));
      
      // Actual score (1 for win)
      const actualScore = 1;
      
      // New ELO
      const eloChange = K * (actualScore - expectedScore);
      const newElo = currentElo + eloChange;

      if (mode === "1v1") {
        await ctx.db.patch(winnerId, { elo_1v1: newElo });
      } else {
        await ctx.db.patch(winnerId, { elo_5v5: newElo });
      }
    }

    // Update losing team ELO
    for (const loserId of losingTeam) {
      const loser = await ctx.db.get(loserId);
      if (!loser) continue;

      const currentElo = mode === "1v1" ? loser.elo_1v1 : loser.elo_5v5;
      
      // Calculate average ELO of winning team
      let winningTeamElo = 0;
      let winningTeamCount = 0;
      for (const winnerId of winningTeam) {
        const winner = await ctx.db.get(winnerId);
        if (winner) {
          winningTeamElo += mode === "1v1" ? winner.elo_1v1 : winner.elo_5v5;
          winningTeamCount++;
        }
      }
      const avgWinningElo = winningTeamCount > 0 ? winningTeamElo / winningTeamCount : currentElo;

      // Expected score
      const expectedScore = 1 / (1 + Math.pow(10, (avgWinningElo - currentElo) / 400));
      
      // Actual score (0 for loss)
      const actualScore = 0;
      
      // New ELO
      const eloChange = K * (actualScore - expectedScore);
      const newElo = currentElo + eloChange;

      if (mode === "1v1") {
        await ctx.db.patch(loserId, { elo_1v1: newElo });
      } else {
        await ctx.db.patch(loserId, { elo_5v5: newElo });
      }
    }

    console.log("Match result processed successfully");
    
    // Schedule server cleanup (will be called after mutation completes)
    if (match.dathostServerId) {
      await ctx.scheduler.runAfter(0, internal.serverCleanup.cleanupFinishedMatchServer, {
        dathostServerId: match.dathostServerId,
      });
      console.log("Server cleanup scheduled for:", match.dathostServerId);
    }
    
    return { success: true };
  },
});
