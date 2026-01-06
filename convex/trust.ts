import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";

/**
 * FASE 30: TRUST FACTOR & ANTI-SMURF SYSTEM
 * Sistema de reputação para filtrar contas maliciosas
 */

const BASE_TRUST_SCORE = 1000;
const POINTS_PER_100_HOURS = 10;
const POINTS_PER_YEAR = 50;
const PENALTY_PER_VALIDATED_REPORT = -100;
const PENALTY_VAC_BAN = -500;
const PENALTY_GAME_BAN = -200;
const MIN_HOURS_TO_PLAY = 0; // Requirement removed
const VERIFIED_THRESHOLD_HOURS = 500;
const VERIFIED_THRESHOLD_TRUST = 1200;

/**
 * Calculate trust score for a user
 * Called after Steam data is fetched or periodically
 */
export const calculateTrust = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    let trustScore = BASE_TRUST_SCORE;

    // Bonus for playtime (CS2 hours)
    const hours = user.steamHours || 0;
    trustScore += Math.floor(hours / 100) * POINTS_PER_100_HOURS;

    // Bonus for account age
    const accountAgeDays = user.steamAccountAge || 0;
    const accountAgeYears = accountAgeDays / 365;
    trustScore += Math.floor(accountAgeYears) * POINTS_PER_YEAR;

    // Penalty for VAC bans
    const vacBans = user.vacBans || 0;
    trustScore += vacBans * PENALTY_VAC_BAN;

    // Penalty for game bans
    const gameBans = user.gameBans || 0;
    trustScore += gameBans * PENALTY_GAME_BAN;

    // Penalty for validated reports
    const validatedReports = await ctx.db
      .query("reports")
      .withIndex("by_reported", (q) => q.eq("reportedId", args.userId))
      .filter((q) => q.eq(q.field("status"), "VALIDATED"))
      .collect();
    
    trustScore += validatedReports.length * PENALTY_PER_VALIDATED_REPORT;

    // Ensure minimum score
    trustScore = Math.max(0, trustScore);

    // Determine if verified (high trust + hours)
    const isVerified = trustScore >= VERIFIED_THRESHOLD_TRUST && hours >= VERIFIED_THRESHOLD_HOURS;

    // Update user
    await ctx.db.patch(args.userId, {
      trustScore,
      isVerified,
      lastTrustUpdate: BigInt(Date.now()),
    });

    return { trustScore, isVerified };
  },
});

/**
 * Check if user can join queue
 * Returns error message if blocked, null if allowed
 */
export const checkQueueEligibility = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return "Utilizador não encontrado";

    // Check if banned
    if (user.isBanned) {
      return "Conta banida. Contacta o suporte.";
    }

    // Check VAC bans
    if ((user.vacBans || 0) > 0) {
      return "Contas com VAC ban não podem jogar.";
    }

    // Check trust score (very low = likely smurf/cheater)
    const trustScore = user.trustScore || BASE_TRUST_SCORE;
    if (trustScore < 500) {
      return "Trust Factor muito baixo. Contacta o suporte.";
    }

    // All checks passed
    return null;
  },
});

/**
 * Get user trust info for display
 */
export const getUserTrustInfo = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const reportCount = await ctx.db
      .query("reports")
      .withIndex("by_reported", (q) => q.eq("reportedId", args.userId))
      .collect();

    const validatedReportCount = reportCount.filter(r => r.status === "VALIDATED").length;

    return {
      trustScore: user.trustScore || BASE_TRUST_SCORE,
      steamHours: user.steamHours || 0,
      steamAccountAge: user.steamAccountAge || 0,
      vacBans: user.vacBans || 0,
      gameBans: user.gameBans || 0,
      isVerified: user.isVerified || false,
      totalReports: reportCount.length,
      validatedReports: validatedReportCount,
    };
  },
});

/**
 * Submit a report against another player
 */
export const submitReport = mutation({
  args: {
    reportedId: v.id("users"),
    matchId: v.id("matches"),
    reason: v.union(
      v.literal("TOXIC"),
      v.literal("CHEATING"),
      v.literal("AFK"),
      v.literal("GRIEFING"),
      v.literal("SMURFING")
    ),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const reporter = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!reporter) throw new Error("Reporter not found");

    // Prevent self-reporting
    if (reporter._id === args.reportedId) {
      throw new Error("Não podes reportar-te a ti mesmo");
    }

    // Check if already reported this user in this match
    const existingReport = await ctx.db
      .query("reports")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .filter((q) => 
        q.and(
          q.eq(q.field("reporterId"), reporter._id),
          q.eq(q.field("reportedId"), args.reportedId)
        )
      )
      .first();

    if (existingReport) {
      throw new Error("Já reportaste este jogador nesta partida");
    }

    // Create report
    const reportId = await ctx.db.insert("reports", {
      reporterId: reporter._id,
      reportedId: args.reportedId,
      matchId: args.matchId,
      reason: args.reason,
      comment: args.comment,
      status: "PENDING",
      createdAt: BigInt(Date.now()),
    });

    return reportId;
  },
});

/**
 * Give positive feedback (commend)
 */
export const commendPlayer = mutation({
  args: {
    targetId: v.id("users"),
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const commender = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!commender) throw new Error("User not found");

    // Prevent self-commending
    if (commender._id === args.targetId) {
      throw new Error("Não podes elogiar-te a ti mesmo");
    }

    const target = await ctx.db.get(args.targetId);
    if (!target) throw new Error("Target not found");

    // Increase reputation slightly
    const newReputation = (target.reputation || 0) + 1;
    await ctx.db.patch(args.targetId, {
      reputation: newReputation,
    });

    return { success: true, newReputation };
  },
});
