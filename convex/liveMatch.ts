import { v } from "convex/values";
import { query } from "./_generated/server";

// Query to get live match data with real-time player stats
export const getLiveMatchData = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    // Get player details for both teams
    const teamAPlayers = await Promise.all(
      match.teamA.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Get player stats for this match
        const stats = await ctx.db
          .query("player_stats")
          .withIndex("by_user_match", (q) =>
            q.eq("userId", userId).eq("matchId", args.matchId)
          )
          .first();

        return {
          ...user,
          displayName: user.clerkId.startsWith("fake_")
            ? user.clerkId.replace("fake_", "Bot").substring(0, 15)
            : user.clerkId.substring(0, 10),
          stats: stats
            ? {
                kills: stats.kills,
                deaths: stats.deaths,
                assists: stats.assists,
                mvps: stats.mvps,
              }
            : { kills: 0, deaths: 0, assists: 0, mvps: 0 },
        };
      })
    );

    const teamBPlayers = await Promise.all(
      match.teamB.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Get player stats for this match
        const stats = await ctx.db
          .query("player_stats")
          .withIndex("by_user_match", (q) =>
            q.eq("userId", userId).eq("matchId", args.matchId)
          )
          .first();

        return {
          ...user,
          displayName: user.clerkId.startsWith("fake_")
            ? user.clerkId.replace("fake_", "Bot").substring(0, 15)
            : user.clerkId.substring(0, 10),
          stats: stats
            ? {
                kills: stats.kills,
                deaths: stats.deaths,
                assists: stats.assists,
                mvps: stats.mvps,
              }
            : { kills: 0, deaths: 0, assists: 0, mvps: 0 },
        };
      })
    );

    return {
      ...match,
      teamAPlayers: teamAPlayers.filter((p) => p !== null),
      teamBPlayers: teamBPlayers.filter((p) => p !== null),
    };
  },
});
