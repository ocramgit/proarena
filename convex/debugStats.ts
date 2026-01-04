import { v } from "convex/values";
import { query } from "./_generated/server";

// Debug query to check player stats for a match
export const getMatchPlayerStats = query({
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

    const users = await Promise.all(
      stats.map(async (stat) => {
        const user = await ctx.db.get(stat.userId);
        return {
          userId: stat.userId,
          steamId: user?.steamId,
          connected: stat.connected,
          kills: stat.kills,
          deaths: stat.deaths,
        };
      })
    );

    return {
      matchId: args.matchId,
      matchState: match.state,
      mode: match.mode,
      expectedPlayers: match.mode === "1v1" ? 2 : 10,
      connectedCount: stats.filter(s => s.connected).length,
      totalStats: stats.length,
      players: users,
    };
  },
});

// Debug query to list all users with their Steam IDs
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    return users.map(u => ({
      id: u._id,
      clerkId: u.clerkId,
      steamId: u.steamId,
      isBanned: u.isBanned,
    }));
  },
});
