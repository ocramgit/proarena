import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * FASE 28: ADVANCED STATS & ANALYTICS
 * Estatísticas detalhadas para perfil de jogador
 */

/**
 * Get ELO history for graph (last 20 matches)
 */
export const getEloHistory = query({
  args: {
    userId: v.id("users"),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
  },
  handler: async (ctx, args) => {
    // Get all finished matches for this user
    const allMatches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "FINISHED"))
      .order("desc")
      .collect();

    const userMatches = allMatches
      .filter((m) => m.mode === args.mode)
      .filter((m) => m.teamA.includes(args.userId) || m.teamB.includes(args.userId))
      .slice(0, 20)
      .reverse(); // Oldest first for graph

    // Get player stats for each match to get ELO changes
    const history = await Promise.all(
      userMatches.map(async (match) => {
        const stats = await ctx.db
          .query("player_stats")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .filter((q) => q.eq(q.field("userId"), args.userId))
          .first();

        return {
          matchId: match._id,
          finishedAt: match.finishedAt,
          oldElo: stats?.oldElo || 1000,
          newElo: stats?.newElo || 1000,
          eloChange: stats?.eloChange || 0,
          won: match.winnerId ? (match.teamA.includes(args.userId) ? match.teamA.includes(match.winnerId) : match.teamB.includes(match.winnerId)) : false,
        };
      })
    );

    return history;
  },
});

/**
 * Get map statistics (win rate per map)
 */
export const getMapStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all finished matches
    const allMatches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "FINISHED"))
      .collect();

    const userMatches = allMatches.filter(
      (m) => m.teamA.includes(args.userId) || m.teamB.includes(args.userId)
    );

    // Group by map
    const mapStats: Record<string, { wins: number; losses: number; total: number }> = {};

    for (const match of userMatches) {
      if (!match.selectedMap) continue;

      const map = match.selectedMap;
      if (!mapStats[map]) {
        mapStats[map] = { wins: 0, losses: 0, total: 0 };
      }

      const isInTeamA = match.teamA.includes(args.userId);
      const won = match.winnerId
        ? isInTeamA
          ? match.teamA.includes(match.winnerId)
          : match.teamB.includes(match.winnerId)
        : false;

      mapStats[map].total++;
      if (won) {
        mapStats[map].wins++;
      } else {
        mapStats[map].losses++;
      }
    }

    // Convert to array and calculate win rate
    const result = Object.entries(mapStats).map(([map, stats]) => ({
      map,
      wins: stats.wins,
      losses: stats.losses,
      total: stats.total,
      winRate: stats.total > 0 ? (stats.wins / stats.total) * 100 : 0,
    }));

    // Sort by total games played
    return result.sort((a, b) => b.total - a.total);
  },
});

/**
 * Get advanced player stats for radar chart
 */
export const getAdvancedStats = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get all player_stats for this user
    const allStats = await ctx.db
      .query("player_stats")
      .withIndex("by_user_match", (q) => q.eq("userId", args.userId))
      .collect();

    // Filter only finished matches
    const finishedStats = await Promise.all(
      allStats.map(async (stat) => {
        const match = await ctx.db.get(stat.matchId);
        return match?.state === "FINISHED" ? stat : null;
      })
    );

    const validStats = finishedStats.filter((s) => s !== null);

    if (validStats.length === 0) {
      return {
        kd: 0,
        winRate: 0,
        hsPercentage: 0,
        survivalRate: 0,
        multiKills: 0,
        totalMatches: 0,
      };
    }

    // Calculate aggregated stats
    const totalKills = validStats.reduce((sum, s) => sum + s.kills, 0);
    const totalDeaths = validStats.reduce((sum, s) => sum + s.deaths, 0);
    const totalHeadshots = validStats.reduce((sum, s) => sum + (s.headshots || 0), 0);
    const totalMultiKills = validStats.reduce(
      (sum, s) => sum + (s.tripleKills || 0) + (s.quadraKills || 0) * 2 + (s.aces || 0) * 3,
      0
    );

    // Calculate win rate
    const matches = await Promise.all(
      validStats.map(async (stat) => {
        const match = await ctx.db.get(stat.matchId);
        if (!match) return null;
        const isInTeamA = match.teamA.includes(args.userId);
        const won = match.winnerId
          ? isInTeamA
            ? match.teamA.includes(match.winnerId)
            : match.teamB.includes(match.winnerId)
          : false;
        return { won, deaths: stat.deaths };
      })
    );

    const validMatches = matches.filter((m) => m !== null);
    const wins = validMatches.filter((m) => m.won).length;
    const survived = validMatches.filter((m) => m.deaths === 0).length;

    return {
      kd: totalDeaths > 0 ? totalKills / totalDeaths : totalKills,
      winRate: validMatches.length > 0 ? (wins / validMatches.length) * 100 : 0,
      hsPercentage: totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0,
      survivalRate: validMatches.length > 0 ? (survived / validMatches.length) * 100 : 0,
      multiKills: totalMultiKills / validMatches.length,
      totalMatches: validMatches.length,
    };
  },
});

/**
 * Get recent match history with details
 */
export const getRecentMatches = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const allMatches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "FINISHED"))
      .order("desc")
      .collect();

    const userMatches = allMatches
      .filter((m) => m.teamA.includes(args.userId) || m.teamB.includes(args.userId))
      .slice(0, args.limit || 10);

    const enriched = await Promise.all(
      userMatches.map(async (match) => {
        const stats = await ctx.db
          .query("player_stats")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .filter((q) => q.eq(q.field("userId"), args.userId))
          .first();

        const isInTeamA = match.teamA.includes(args.userId);
        const won = match.winnerId
          ? isInTeamA
            ? match.teamA.includes(match.winnerId)
            : match.teamB.includes(match.winnerId)
          : false;

        return {
          matchId: match._id,
          map: match.selectedMap,
          won,
          kills: stats?.kills || 0,
          deaths: stats?.deaths || 0,
          assists: stats?.assists || 0,
          eloChange: stats?.eloChange || 0,
          finishedAt: match.finishedAt,
        };
      })
    );

    return enriched;
  },
});
