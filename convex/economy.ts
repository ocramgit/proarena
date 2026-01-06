import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * MEGA ATUALIZAÇÃO: ECONOMIA - SOBERANAS
 * Sistema de moeda virtual para recompensas e loja
 */

const CURRENCY_SYMBOL = "SOB";
const MATCH_WIN_REWARD = 10;
const MATCH_LOSS_REWARD = 3;

/**
 * Função atómica para processar transações
 * Garante consistência do saldo
 */
export const processTransaction = internalMutation({
  args: {
    userId: v.id("users"),
    amount: v.float64(),
    type: v.union(
      v.literal("ADMIN"),
      v.literal("MATCH_WIN"),
      v.literal("MATCH_LOSS"),
      v.literal("REFERRAL"),
      v.literal("REFUND"),
      v.literal("STORE"),
      v.literal("SYSTEM")
    ),
    description: v.string(),
    relatedMatchId: v.optional(v.id("matches")),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentBalance = user.balance || 0;
    const newBalance = currentBalance + args.amount;

    // Prevent negative balance (except for admin adjustments)
    if (newBalance < 0 && args.type !== "ADMIN") {
      throw new Error("Insufficient balance");
    }

    // Update user balance
    await ctx.db.patch(args.userId, {
      balance: newBalance,
    });

    // Record transaction
    await ctx.db.insert("transactions", {
      userId: args.userId,
      amount: args.amount,
      type: args.type,
      description: args.description,
      timestamp: BigInt(Date.now()),
      relatedMatchId: args.relatedMatchId,
    });

    console.log(
      `💰 Transaction: ${user.steamName || user.clerkId} ${args.amount > 0 ? "+" : ""}${args.amount} ${CURRENCY_SYMBOL} (${args.type})`
    );

    return { success: true, newBalance };
  },
});

/**
 * Recompensa automática para vencedor de partida
 */
export const rewardMatchWinner = internalMutation({
  args: {
    winnerId: v.id("users"),
    loserId: v.id("users"),
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    // Winner gets 10 Soberanas
    await ctx.runMutation(internal.economy.processTransaction, {
      userId: args.winnerId,
      amount: MATCH_WIN_REWARD,
      type: "MATCH_WIN",
      description: `Victory reward`,
      relatedMatchId: args.matchId,
    });

    // Loser gets 3 Soberanas (participation)
    await ctx.runMutation(internal.economy.processTransaction, {
      userId: args.loserId,
      amount: MATCH_LOSS_REWARD,
      type: "MATCH_LOSS",
      description: `Participation reward`,
      relatedMatchId: args.matchId,
    });

    console.log(`🏆 Match rewards distributed for match ${args.matchId}`);
  },
});

/**
 * Get user balance
 */
export const getBalance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return {
      balance: user.balance || 0,
      symbol: CURRENCY_SYMBOL,
    };
  },
});

/**
 * Get transaction history
 */
export const getTransactionHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return [];

    const transactions = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 50);

    return transactions;
  },
});

/**
 * ADMIN: Adjust user balance
 */
export const adminAdjustBalance = mutation({
  args: {
    userId: v.id("users"),
    amount: v.float64(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!admin || admin.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin only");
    }

    await ctx.runMutation(internal.economy.processTransaction, {
      userId: args.userId,
      amount: args.amount,
      type: "ADMIN",
      description: `Admin adjustment: ${args.reason}`,
    });

    return { success: true };
  },
});
