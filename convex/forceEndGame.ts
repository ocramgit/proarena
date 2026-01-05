import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Manual force end for testing - uses same flow as automatic game end
export const forceEndGame = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    
    if (!match) {
      throw new Error("Match not found");
    }
    
    if (match.state === "FINISHED" || match.state === "CANCELLED") {
      return { success: false, message: "Match already ended" };
    }
    
    console.log("🔴 FORCE END GAME");
    
    const scoreA = match.scoreTeamA || 0;
    const scoreB = match.scoreTeamB || 0;
    const winner = scoreA > scoreB ? "team1" : "team2";
    
    // Use same flow as automatic game end
    await ctx.scheduler.runAfter(0, internal.matchResults.processMatchResult, {
      dathostMatchId: match.dathostMatchId || "manual",
      winner: winner,
      scoreTeam1: scoreA,
      scoreTeam2: scoreB,
    });
    
    return { 
      success: true, 
      message: "Game ended",
      winner: winner,
      finalScore: `${scoreA} - ${scoreB}`
    };
  },
});
