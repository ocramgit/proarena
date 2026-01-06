import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

/**
 * PRIORIDADE MÉDIA: ADMIN FINANCE
 * Gestão financeira e tracking de custos de servidor
 */

/**
 * Get all transactions (admin only)
 */
export const getAllTransactions = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!admin || admin.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin only");
    }

    let transactions;

    // Filter by user if specified
    if (args.userId !== undefined) {
      transactions = await ctx.db
        .query("transactions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .order("desc")
        .take(args.limit || 100);
    } else {
      transactions = await ctx.db
        .query("transactions")
        .order("desc")
        .take(args.limit || 100);
    }

    // Enrich with user data
    const enriched = await Promise.all(
      transactions.map(async (tx) => {
        const user = await ctx.db.get(tx.userId);
        return {
          ...tx,
          user: user
            ? {
                _id: user._id,
                steamName: user.steamName,
                clerkId: user.clerkId,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get financial stats (admin only)
 */
export const getFinancialStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!admin || admin.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin only");
    }

    // Get all transactions
    const transactions = await ctx.db.query("transactions").collect();

    // Calculate totals
    const totalIssued = transactions
      .filter((tx) => tx.amount > 0)
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalSpent = transactions
      .filter((tx) => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);

    const totalCirculation = totalIssued - totalSpent;

    // Get all users with balance
    const users = await ctx.db.query("users").collect();
    const totalUsersWithBalance = users.filter((u) => (u.balance || 0) > 0).length;

    // Get server costs
    const matches = await ctx.db.query("matches").collect();
    const totalServerCost = matches
      .filter((m) => m.serverCost)
      .reduce((sum, m) => sum + (m.serverCost || 0), 0);

    return {
      totalIssued,
      totalSpent,
      totalCirculation,
      totalUsersWithBalance,
      totalServerCost,
      transactionCount: transactions.length,
    };
  },
});

/**
 * Update server cost for a match (admin only)
 */
export const updateServerCost = mutation({
  args: {
    matchId: v.id("matches"),
    cost: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!admin || admin.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin only");
    }

    await ctx.db.patch(args.matchId, {
      serverCost: args.cost,
    });

    return { success: true };
  },
});

/**
 * Get server cost summary (admin only)
 */
export const getServerCostSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const admin = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!admin || admin.role !== "ADMIN") {
      throw new Error("Unauthorized - Admin only");
    }

    const matches = await ctx.db.query("matches").collect();

    // Calculate costs
    const totalCost = matches
      .filter((m) => m.serverCost)
      .reduce((sum, m) => sum + (m.serverCost || 0), 0);

    const matchesWithCost = matches.filter((m) => m.serverCost).length;
    const averageCost = matchesWithCost > 0 ? totalCost / matchesWithCost : 0;

    // Group by state
    const costByState = matches.reduce((acc, m) => {
      if (!m.serverCost) return acc;
      const state = m.state;
      acc[state] = (acc[state] || 0) + m.serverCost;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCost,
      matchesWithCost,
      averageCost,
      costByState,
    };
  },
});
