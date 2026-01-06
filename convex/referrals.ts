import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * FASE 26: REFERRAL SYSTEM
 * Sistema de indicações com recompensas
 */

const REFERRAL_REWARD = 50; // SOB for both referrer and referee
const MATCHES_REQUIRED = 3; // Number of matches to complete before reward

/**
 * Generate referral code for user
 */
export const generateReferralCode = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Check if user already has a referral code
    if (user.referralCode) {
      return { code: user.referralCode };
    }

    // Generate unique code (first 8 chars of userId + random)
    const code = `${user._id.slice(0, 8)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase();

    await ctx.db.patch(user._id, {
      referralCode: code,
    });

    console.log(`🔗 Referral code generated for ${user.steamName || user.clerkId}: ${code}`);

    return { code };
  },
});

/**
 * Use referral code (when signing up)
 */
export const useReferralCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Check if user already used a referral code
    if (user.referredBy) {
      throw new Error("You already used a referral code");
    }

    // Find referrer by code
    const referrer = await ctx.db
      .query("users")
      .withIndex("by_referralCode", (q) => q.eq("referralCode", args.code.toUpperCase()))
      .first();

    if (!referrer) {
      throw new Error("Invalid referral code");
    }

    // Can't refer yourself
    if (referrer._id === user._id) {
      throw new Error("You can't use your own referral code");
    }

    // Update user with referrer
    await ctx.db.patch(user._id, {
      referredBy: referrer._id,
    });

    console.log(`🎁 ${user.steamName || user.clerkId} used referral code from ${referrer.steamName || referrer.clerkId}`);

    // Send notification to referrer
    await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
      userId: referrer._id,
      title: "New Referral!",
      message: `Someone used your referral code! You'll both get ${REFERRAL_REWARD} SOB when they complete ${MATCHES_REQUIRED} matches.`,
      type: "SYSTEM",
    });

    return { success: true, referrer: referrer.steamName || "Unknown" };
  },
});

/**
 * Check and process referral rewards
 * Called after each match finishes
 */
export const checkReferralReward = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.referredBy) return;

    const matchesPlayed = user.matchesPlayed || 0;

    // Check if user just completed their 3rd match
    if (matchesPlayed === MATCHES_REQUIRED) {
      const referrer = await ctx.db.get(user.referredBy);
      if (!referrer) return;

      // Reward both users
      await ctx.scheduler.runAfter(0, internal.economy.processTransaction, {
        userId: user._id,
        amount: REFERRAL_REWARD,
        type: "REFERRAL",
        description: `Referral reward - completed ${MATCHES_REQUIRED} matches`,
      });

      await ctx.scheduler.runAfter(0, internal.economy.processTransaction, {
        userId: referrer._id,
        amount: REFERRAL_REWARD,
        type: "REFERRAL",
        description: `Referral reward - ${user.steamName || "player"} completed ${MATCHES_REQUIRED} matches`,
      });

      // Notify both users
      await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
        userId: user._id,
        title: "Referral Reward!",
        message: `You earned ${REFERRAL_REWARD} SOB for completing ${MATCHES_REQUIRED} matches!`,
        type: "SYSTEM",
      });

      await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
        userId: referrer._id,
        title: "Referral Reward!",
        message: `You earned ${REFERRAL_REWARD} SOB! ${user.steamName || "Your referral"} completed ${MATCHES_REQUIRED} matches.`,
        type: "SYSTEM",
      });

      console.log(`🎁 Referral rewards distributed: ${user.steamName} & ${referrer.steamName} each got ${REFERRAL_REWARD} SOB`);
    }
  },
});

/**
 * Get my referral stats
 */
export const getMyReferralStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    // Count referrals
    const referrals = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("referredBy"), user._id))
      .collect();

    return {
      code: user.referralCode,
      totalReferrals: referrals.length,
      referrals: referrals.map((r) => ({
        steamName: r.steamName,
        matchesPlayed: r.matchesPlayed || 0,
        rewarded: (r.matchesPlayed || 0) >= MATCHES_REQUIRED,
      })),
    };
  },
});
