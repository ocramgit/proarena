import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * FASE 54: RANKING SYSTEM
 * Internal platform rankings + weekly updates
 */

// Get current week in ISO format (YYYY-WXX)
function getCurrentWeek(): string {
  const now = new Date();
  const onejan = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNum.toString().padStart(2, "0")}`;
}

/**
 * Get current week's Top 30 rankings
 */
export const getTopRankings = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 30;
    const currentWeek = getCurrentWeek();

    // Get rankings for current week
    let rankings = await ctx.db
      .query("rankings")
      .withIndex("by_week_rank", (q) => q.eq("week", currentWeek))
      .order("asc")
      .take(limit);

    // If no rankings for current week, get latest from orgs directly
    if (rankings.length === 0) {
      const orgs = await ctx.db
        .query("organizations")
        .order("desc")
        .take(50);

      // Sort by ranking points
      const sortedOrgs = orgs
        .filter(o => (o.rankingPoints || 0) > 0)
        .sort((a, b) => (b.rankingPoints || 0) - (a.rankingPoints || 0))
        .slice(0, limit);

      return await Promise.all(sortedOrgs.map(async (org, idx) => ({
        _id: org._id,
        rank: idx + 1,
        previousRank: org.previousRank,
        change: org.previousRank ? org.previousRank - (idx + 1) : 0,
        org: {
          _id: org._id,
          name: org.name,
          tag: org.tag,
          logoUrl: org.logoUrl,
          isVerified: org.isVerified,
        },
        points: org.rankingPoints || 0,
        wins: org.totalWins || 0,
        losses: org.totalLosses || 0,
      })));
    }

    // Enrich with org data
    return await Promise.all(rankings.map(async (ranking) => {
      const org = await ctx.db.get(ranking.orgId);
      return {
        _id: ranking._id,
        rank: ranking.rank,
        previousRank: ranking.previousRank,
        change: ranking.change || 0,
        org: org ? {
          _id: org._id,
          name: org.name,
          tag: org.tag,
          logoUrl: org.logoUrl,
          isVerified: org.isVerified,
        } : null,
        points: ranking.points,
        wins: ranking.wins,
        losses: ranking.losses,
        tournamentWins: ranking.tournamentWins || 0,
      };
    }));
  },
});

/**
 * Get ranking history for an organization
 */
export const getOrgRankingHistory = query({
  args: { 
    orgId: v.id("organizations"),
    weeks: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const weeksToFetch = args.weeks || 12;

    const rankings = await ctx.db
      .query("rankings")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(weeksToFetch);

    return rankings.map(r => ({
      week: r.week,
      rank: r.rank,
      points: r.points,
      change: r.change || 0,
    }));
  },
});

/**
 * Calculate and update weekly rankings
 * Should be called every Monday via cron
 */
export const calculateWeeklyRankings = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("📊 [RANKINGS] Calculating weekly rankings...");

    const currentWeek = getCurrentWeek();

    // Get all organizations with points
    const orgs = await ctx.db
      .query("organizations")
      .order("desc")
      .collect();

    // Sort by ranking points
    const sortedOrgs = orgs
      .filter(o => (o.rankingPoints || 0) > 0 || (o.totalWins || 0) > 0)
      .sort((a, b) => (b.rankingPoints || 0) - (a.rankingPoints || 0));

    // Create ranking entries
    for (let i = 0; i < sortedOrgs.length; i++) {
      const org = sortedOrgs[i];
      const newRank = i + 1;
      const change = org.previousRank ? org.previousRank - newRank : 0;

      // Insert ranking record
      await ctx.db.insert("rankings", {
        orgId: org._id,
        week: currentWeek,
        points: org.rankingPoints || 0,
        rank: newRank,
        previousRank: org.currentRank,
        change,
        wins: org.totalWins || 0,
        losses: org.totalLosses || 0,
        calculatedAt: BigInt(Date.now()),
      });

      // Update org's current rank
      await ctx.db.patch(org._id, {
        previousRank: org.currentRank,
        currentRank: newRank,
      });
    }

    console.log(`✅ [RANKINGS] Updated ${sortedOrgs.length} organizations for week ${currentWeek}`);
    return { updated: sortedOrgs.length, week: currentWeek };
  },
});

/**
 * Award ranking points to organization
 * Called after tournament matches
 */
export const awardPoints = internalMutation({
  args: {
    orgId: v.id("organizations"),
    points: v.float64(),
    reason: v.string(),
    isWin: v.boolean(),
    isTournamentWin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return;

    const updates: Record<string, any> = {
      rankingPoints: (org.rankingPoints || 0) + args.points,
      updatedAt: BigInt(Date.now()),
    };

    if (args.isWin) {
      updates.totalWins = (org.totalWins || 0) + 1;
    } else {
      updates.totalLosses = (org.totalLosses || 0) + 1;
    }

    await ctx.db.patch(args.orgId, updates);

    console.log(`🏆 [POINTS] ${org.name}: +${args.points} points (${args.reason})`);
  },
});

/**
 * Get ranking position for org
 */
export const getOrgRank = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const org = await ctx.db.get(args.orgId);
    if (!org) return null;

    return {
      currentRank: org.currentRank,
      previousRank: org.previousRank,
      points: org.rankingPoints || 0,
      change: org.previousRank && org.currentRank 
        ? org.previousRank - org.currentRank 
        : 0,
    };
  },
});

/**
 * POINTS SYSTEM:
 * Tournament Win: +100 points
 * Tournament 2nd: +60 points
 * Tournament 3rd: +40 points
 * Match Win (Official): +10 points
 * Match Loss: -5 points (min 0)
 * Pracc Win: +2 points
 */
export const POINTS = {
  TOURNAMENT_WIN: 100,
  TOURNAMENT_2ND: 60,
  TOURNAMENT_3RD: 40,
  MATCH_WIN: 10,
  MATCH_LOSS: -5,
  PRACC_WIN: 2,
};

/**
 * Record org match result and award points
 */
export const recordOrgMatchResult = internalMutation({
  args: {
    orgId: v.id("organizations"),
    opponentOrgId: v.optional(v.id("organizations")),
    opponentName: v.string(),
    map: v.string(),
    scoreUs: v.float64(),
    scoreThem: v.float64(),
    isWin: v.boolean(),
    tournamentId: v.optional(v.id("tournaments")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    matchId: v.optional(v.id("matches")),
  },
  handler: async (ctx, args) => {
    // Record the match
    await ctx.db.insert("org_matches", {
      orgId: args.orgId,
      opponentOrgId: args.opponentOrgId,
      opponentName: args.opponentName,
      map: args.map,
      scoreUs: args.scoreUs,
      scoreThem: args.scoreThem,
      isWin: args.isWin,
      tournamentId: args.tournamentId,
      tournamentMatchId: args.tournamentMatchId,
      matchId: args.matchId,
      playedAt: BigInt(Date.now()),
    });

    // Award points
    const points = args.isWin ? POINTS.MATCH_WIN : POINTS.MATCH_LOSS;
    const org = await ctx.db.get(args.orgId);
    if (!org) return;

    const newPoints = Math.max(0, (org.rankingPoints || 0) + points);
    
    await ctx.db.patch(args.orgId, {
      rankingPoints: newPoints,
      totalWins: args.isWin ? (org.totalWins || 0) + 1 : org.totalWins,
      totalLosses: !args.isWin ? (org.totalLosses || 0) + 1 : org.totalLosses,
      updatedAt: BigInt(Date.now()),
    });

    // Also record for opponent if they're on platform
    if (args.opponentOrgId) {
      const opponent = await ctx.db.get(args.opponentOrgId);
      if (opponent) {
        await ctx.db.insert("org_matches", {
          orgId: args.opponentOrgId,
          opponentOrgId: args.orgId,
          opponentName: org.name,
          map: args.map,
          scoreUs: args.scoreThem,
          scoreThem: args.scoreUs,
          isWin: !args.isWin,
          tournamentId: args.tournamentId,
          tournamentMatchId: args.tournamentMatchId,
          matchId: args.matchId,
          playedAt: BigInt(Date.now()),
        });

        const opponentPoints = !args.isWin ? POINTS.MATCH_WIN : POINTS.MATCH_LOSS;
        const newOpponentPoints = Math.max(0, (opponent.rankingPoints || 0) + opponentPoints);

        await ctx.db.patch(args.opponentOrgId, {
          rankingPoints: newOpponentPoints,
          totalWins: !args.isWin ? (opponent.totalWins || 0) + 1 : opponent.totalWins,
          totalLosses: args.isWin ? (opponent.totalLosses || 0) + 1 : opponent.totalLosses,
          updatedAt: BigInt(Date.now()),
        });
      }
    }
  },
});
