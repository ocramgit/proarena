import { v } from "convex/values";
import { query } from "./_generated/server";

export const getLiveMatchData = query({
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

    const allPlayerIds = [...match.teamA, ...match.teamB];

    const players = await Promise.all(
      allPlayerIds.map(async (userId) => {
        const user = await ctx.db.get(userId);
        const playerStat = stats.find((s) => s.userId === userId);

        return {
          _id: userId,
          clerkId: user?.clerkId,
          steamId: user?.steamId,
          steamName: user?.steamName,
          nickname: user?.nickname,
          kills: playerStat?.kills ?? 0,
          deaths: playerStat?.deaths ?? 0,
          assists: playerStat?.assists ?? 0,
          mvps: playerStat?.mvps ?? 0,
          connected: playerStat?.connected ?? false,
        };
      })
    );

    const teamAPlayers = players.filter((p) => match.teamA.includes(p._id));
    const teamBPlayers = players.filter((p) => match.teamB.includes(p._id));

    return {
      ...match,
      players,
      teamAPlayers,
      teamBPlayers,
    };
  },
});
