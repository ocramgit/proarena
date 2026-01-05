import { v } from "convex/values";
import { query } from "./_generated/server";

export const getMyActiveMatch = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    const activeMatches = await ctx.db
      .query("matches")
      .filter((q) =>
        q.or(
          q.eq(q.field("state"), "CONFIRMING"),
          q.eq(q.field("state"), "VETO"),
          q.eq(q.field("state"), "CONFIGURING"),
          q.eq(q.field("state"), "WARMUP"),
          q.eq(q.field("state"), "LIVE")
        )
      )
      .collect();

    const myMatch = activeMatches.find(
      (match) =>
        match.teamA.includes(user._id) || match.teamB.includes(user._id)
    );

    return myMatch;
  },
});

export const getMatchById = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    let currentUserId = null;

    if (identity) {
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();
      if (currentUser) {
        currentUserId = currentUser._id;
      }
    }

    const teamAUsers = await Promise.all(
      match.teamA.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (!user) return null;
        
        const isCurrentUser = currentUserId && userId === currentUserId;
        const isFake = user.clerkId.startsWith("fake_");
        
        // Use steamName if available, otherwise use clerkId
        const displayName = user.steamName || user.clerkId.substring(0, 10);
        
        return {
          ...user,
          displayName: isCurrentUser 
            ? displayName + " (TU)" 
            : isFake 
            ? user.clerkId.replace("fake_", "Bot ").substring(0, 15)
            : displayName,
          isCurrentUser,
        };
      })
    );

    const teamBUsers = await Promise.all(
      match.teamB.map(async (userId) => {
        const user = await ctx.db.get(userId);
        if (!user) return null;
        
        const isCurrentUser = currentUserId && userId === currentUserId;
        const isFake = user.clerkId.startsWith("fake_");
        
        // Use steamName if available, otherwise use clerkId
        const displayName = user.steamName || user.clerkId.substring(0, 10);
        
        return {
          ...user,
          displayName: isCurrentUser 
            ? displayName + " (TU)" 
            : isFake 
            ? user.clerkId.replace("fake_", "Bot ").substring(0, 15)
            : displayName,
          isCurrentUser,
        };
      })
    );

    return {
      ...match,
      teamAPlayers: teamAUsers.filter((u) => u !== null),
      teamBPlayers: teamBUsers.filter((u) => u !== null),
    };
  },
});

export const getMyMatchHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      return [];
    }

    // PHASE 12: Get all finished matches (exclude CANCELLED from stats)
    const allMatches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "FINISHED"))
      .collect();

    const myMatches = allMatches.filter(
      (match) =>
        match.teamA.includes(user._id) || match.teamB.includes(user._id)
    );

    // Get player stats for each match
    const matchHistory = await Promise.all(
      myMatches.map(async (match) => {
        const playerStat = await ctx.db
          .query("player_stats")
          .withIndex("by_user_match", (q) =>
            q.eq("userId", user._id).eq("matchId", match._id)
          )
          .first();

        // Determine if user won
        const isInTeamA = match.teamA.includes(user._id);
        const teamAWon = match.winnerId && match.teamA.includes(match.winnerId);
        const isWin = isInTeamA ? teamAWon : !teamAWon;

        return {
          _id: match._id,
          map: match.selectedMap,
          scoreTeamA: match.scoreTeamA || 0,
          scoreTeamB: match.scoreTeamB || 0,
          result: isWin ? "WIN" : "LOSS",
          kills: playerStat?.kills || 0,
          deaths: playerStat?.deaths || 0,
          assists: playerStat?.assists || 0,
          finishedAt: match._creationTime, // Using creation time as proxy for finished time
        };
      })
    );

    // Sort by most recent first
    return matchHistory.sort((a, b) => b.finishedAt - a.finishedAt);
  },
});
