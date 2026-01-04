import { v } from "convex/values";
import { query } from "./_generated/server";

export const getLiveMatchData = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    
    // Get player stats
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    
    // Get user details for all players
    const allPlayerIds = [...match.teamA, ...match.teamB];
    const players = await Promise.all(
      allPlayerIds.map(async (id) => {
        const user = await ctx.db.get(id);
        const playerStat = stats.find(s => s.userId === id);
        
        return {
          userId: id,
          clerkId: user?.clerkId || "",
          displayName: user?.clerkId?.substring(0, 10) || "Player",
          steamId: user?.steamId || "",
          steam_id_64: user?.steamId || "",
          kills: playerStat?.kills || 0,
          deaths: playerStat?.deaths || 0,
          assists: playerStat?.assists || 0,
          mvps: playerStat?.mvps || 0,
          connected: playerStat?.connected || false,
        };
      })
    );
    
    return {
      match,
      players,
      teamAPlayers: players.filter(p => match.teamA.includes(p.userId)),
      teamBPlayers: players.filter(p => match.teamB.includes(p.userId)),
    };
  },
});

export const getMatchHistory = query({
  args: {
    userId: v.optional(v.id("users")),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    let history;
    
    if (args.userId) {
      // Get all history and filter in memory (simpler approach)
      const allHistory = await ctx.db.query("match_history").collect();
      history = allHistory
        .filter(h => h.teamA.includes(args.userId!) || h.teamB.includes(args.userId!))
        .sort((a, b) => Number(b.finishedAt - a.finishedAt))
        .slice(0, args.limit || 20);
    } else {
      history = await ctx.db
        .query("match_history")
        .order("desc")
        .take(args.limit || 20);
    }
    
    // Enrich with user data
    const enrichedHistory = await Promise.all(
      history.map(async (h) => {
        const teamAUsers = await Promise.all(
          h.teamA.map(id => ctx.db.get(id))
        );
        const teamBUsers = await Promise.all(
          h.teamB.map(id => ctx.db.get(id))
        );
        const winner = await ctx.db.get(h.winnerId);
        
        return {
          ...h,
          teamAUsers: teamAUsers.filter(u => u !== null),
          teamBUsers: teamBUsers.filter(u => u !== null),
          winner,
        };
      })
    );
    
    return enrichedHistory;
  },
});

export const getMatchDetails = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    
    // Get match history entry
    const history = await ctx.db
      .query("match_history")
      .filter((q) => q.eq(q.field("matchId"), args.matchId))
      .first();
    
    // Get final player stats
    const stats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    
    // Get user details
    const allPlayerIds = [...match.teamA, ...match.teamB];
    const players = await Promise.all(
      allPlayerIds.map(async (id) => {
        const user = await ctx.db.get(id);
        const playerStat = stats.find(s => s.userId === id);
        
        return {
          userId: id,
          clerkId: user?.clerkId || "",
          steamId: user?.steamId || "",
          kills: playerStat?.kills || 0,
          deaths: playerStat?.deaths || 0,
          assists: playerStat?.assists || 0,
          mvps: playerStat?.mvps || 0,
          eloChange: playerStat?.eloChange,
          oldElo: playerStat?.oldElo,
          newElo: playerStat?.newElo,
        };
      })
    );
    
    return {
      match,
      history,
      players,
      teamAPlayers: players.filter(p => match.teamA.includes(p.userId)),
      teamBPlayers: players.filter(p => match.teamB.includes(p.userId)),
    };
  },
});
