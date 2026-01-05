import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Poll DatHost API for live match updates
export const pollLiveMatch = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    // Get match data
    const match = await ctx.runMutation(internal.liveMatchPolling.getMatchForPolling, {
      matchId: args.matchId,
    });

    if (!match || match.state !== "LIVE" || !match.dathostMatchId) {
      console.log("⚠️ Match not LIVE or no DatHost ID, stopping polling");
      return { shouldContinue: false };
    }

    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("❌ Missing DatHost credentials");
      return { shouldContinue: false };
    }

    const auth = btoa(`${username}:${password}`);

    try {
      console.log("🔄 Polling DatHost API for match:", match.dathostMatchId);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/cs2-matches/${match.dathostMatchId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to poll DatHost:", response.status);
        return { shouldContinue: true };
      }

      const matchData = await response.json();
      
      console.log("📊 DatHost Data - Team1:", matchData.team1_stats?.score || 0, "Team2:", matchData.team2_stats?.score || 0);

      // Update match scores from DatHost
      await ctx.runMutation(internal.liveMatchPolling.updateMatchScores, {
        matchId: args.matchId,
        scoreTeam1: matchData.team1_stats?.score || 0,
        scoreTeam2: matchData.team2_stats?.score || 0,
        finished: matchData.finished || false,
      });

      // Check if match finished
      if (matchData.finished === true) {
        console.log("🏁 Match finished, triggering end game");
        
        const winner = (matchData.team1_stats?.score || 0) > (matchData.team2_stats?.score || 0) ? "team1" : "team2";
        
        await ctx.runMutation(internal.matchResults.processMatchResult, {
          dathostMatchId: match.dathostMatchId,
          winner: winner,
          scoreTeam1: matchData.team1_stats?.score || 0,
          scoreTeam2: matchData.team2_stats?.score || 0,
        });
        
        return { shouldContinue: false };
      }

      // Continue polling
      return { shouldContinue: true };
    } catch (error) {
      console.error("Error polling DatHost:", error);
      return { shouldContinue: true };
    }
  },
});

// Helper mutation to get match data
export const getMatchForPolling = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});

// Helper mutation to update scores
export const updateMatchScores = internalMutation({
  args: {
    matchId: v.id("matches"),
    scoreTeam1: v.float64(),
    scoreTeam2: v.float64(),
    finished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    // Only update if scores changed
    if (match.scoreTeamA !== args.scoreTeam1 || match.scoreTeamB !== args.scoreTeam2) {
      await ctx.db.patch(args.matchId, {
        scoreTeamA: args.scoreTeam1,
        scoreTeamB: args.scoreTeam2,
      });
      console.log("✅ Updated scores from DatHost:", args.scoreTeam1, "-", args.scoreTeam2);
    }
  },
});

// Start polling when match goes LIVE
export const startLiveMatchPolling = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    console.log("🚀 Starting live match polling for:", args.matchId);
    
    // Schedule first poll immediately
    await ctx.scheduler.runAfter(0, internal.liveMatchPolling.pollAndScheduleNext, {
      matchId: args.matchId,
    });
  },
});

// Poll and schedule next poll
export const pollAndScheduleNext = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runAction(internal.liveMatchPolling.pollLiveMatch, {
      matchId: args.matchId,
    });

    // If should continue, schedule next poll in 5 seconds
    if (result.shouldContinue) {
      await ctx.scheduler.runAfter(5000, internal.liveMatchPolling.pollAndScheduleNext, {
        matchId: args.matchId,
      });
    } else {
      console.log("⏹️ Stopped polling for match:", args.matchId);
    }
  },
});
