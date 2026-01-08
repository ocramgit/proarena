import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * FASE 54: WAGER ADMIN MANAGEMENT
 * Admin tools for managing wagers, refunds, and force settlements
 */

// Helper to check admin permission
async function checkAdminPermission(ctx: any): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;

  const email = identity.email;
  if (!email) return false;

  // Check super admin
  if (email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL) return true;

  // Check staff role
  const staffMember = await ctx.db
    .query("staff_members")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .first();

  return staffMember?.role === "ADMIN";
}

/**
 * Get all wagers for admin panel
 */
export const getAllWagers = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const isAdmin = await checkAdminPermission(ctx);
    if (!isAdmin) return [];

    let wagersQuery;
    
    if (args.status) {
      wagersQuery = ctx.db
        .query("wagers")
        .withIndex("by_status", (q: any) => q.eq("status", args.status))
        .order("desc");
    } else {
      wagersQuery = ctx.db
        .query("wagers")
        .order("desc");
    }

    const wagers = await wagersQuery.take(args.limit || 100);

    // Enrich with player info
    const enriched = await Promise.all(
      wagers.map(async (wager) => {
        const creator = await ctx.db.get(wager.creatorId);
        const opponent = wager.opponentId ? await ctx.db.get(wager.opponentId) : null;
        const winner = wager.winnerId ? await ctx.db.get(wager.winnerId) : null;

        return {
          ...wager,
          creator: {
            _id: creator?._id,
            nickname: creator?.nickname || creator?.steamName,
            steamAvatar: creator?.steamAvatar,
          },
          opponent: opponent
            ? {
                _id: opponent._id,
                nickname: opponent.nickname || opponent.steamName,
                steamAvatar: opponent.steamAvatar,
              }
            : null,
          winner: winner
            ? {
                _id: winner._id,
                nickname: winner.nickname || winner.steamName,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get wager details with transactions
 */
export const getWagerDetails = query({
  args: { wagerId: v.id("wagers") },
  handler: async (ctx, args) => {
    const isAdmin = await checkAdminPermission(ctx);
    if (!isAdmin) return null;

    const wager = await ctx.db.get(args.wagerId);
    if (!wager) return null;

    const creator = await ctx.db.get(wager.creatorId);
    const opponent = wager.opponentId ? await ctx.db.get(wager.opponentId) : null;

    // Get transactions for this wager
    const transactions = await ctx.db
      .query("wager_transactions")
      .withIndex("by_wager", (q) => q.eq("wagerId", args.wagerId))
      .collect();

    // Get match info if linked
    const match = wager.matchId ? await ctx.db.get(wager.matchId) : null;

    return {
      ...wager,
      creator: {
        _id: creator?._id,
        nickname: creator?.nickname || creator?.steamName,
        steamAvatar: creator?.steamAvatar,
        balance: creator?.balance,
      },
      opponent: opponent
        ? {
            _id: opponent._id,
            nickname: opponent.nickname || opponent.steamName,
            steamAvatar: opponent.steamAvatar,
            balance: opponent.balance,
          }
        : null,
      transactions,
      match,
    };
  },
});

/**
 * ADMIN: Cancel & Refund wager
 * Refunds 100% to both players
 */
export const adminCancelAndRefund = mutation({
  args: {
    wagerId: v.id("wagers"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const isAdmin = await checkAdminPermission(ctx);
    if (!isAdmin) throw new Error("Unauthorized");

    const identity = await ctx.auth.getUserIdentity();
    const adminEmail = identity?.email || "unknown";

    const wager = await ctx.db.get(args.wagerId);
    if (!wager) throw new Error("Wager not found");

    // Can only cancel active wagers
    if (wager.status === "FINISHED" || wager.status === "CANCELLED") {
      throw new Error("Wager já foi finalizado ou cancelado");
    }

    const now = Date.now();

    // Refund creator
    const creator = await ctx.db.get(wager.creatorId);
    if (creator) {
      const creatorBalanceBefore = creator.balance ?? 0;
      const creatorBalanceAfter = creatorBalanceBefore + wager.creatorLockedAmount;
      await ctx.db.patch(creator._id, { balance: creatorBalanceAfter });

      await ctx.db.insert("wager_transactions", {
        wagerId: args.wagerId,
        userId: creator._id,
        type: "REFUND",
        amount: wager.creatorLockedAmount,
        balanceBefore: creatorBalanceBefore,
        balanceAfter: creatorBalanceAfter,
        description: `Wager #${args.wagerId.slice(-6)} - Reembolso Admin`,
        createdAt: BigInt(now),
      });
    }

    // Refund opponent if exists
    if (wager.opponentId && wager.opponentLockedAmount) {
      const opponent = await ctx.db.get(wager.opponentId);
      if (opponent) {
        const opponentBalanceBefore = opponent.balance ?? 0;
        const opponentBalanceAfter = opponentBalanceBefore + wager.opponentLockedAmount;
        await ctx.db.patch(opponent._id, { balance: opponentBalanceAfter });

        await ctx.db.insert("wager_transactions", {
          wagerId: args.wagerId,
          userId: opponent._id,
          type: "REFUND",
          amount: wager.opponentLockedAmount,
          balanceBefore: opponentBalanceBefore,
          balanceAfter: opponentBalanceAfter,
          description: `Wager #${args.wagerId.slice(-6)} - Reembolso Admin`,
          createdAt: BigInt(now),
        });
      }
    }

    // Update wager status
    await ctx.db.patch(args.wagerId, {
      status: "CANCELLED",
      cancelReason: args.reason,
      adminNote: `Cancelado por ${adminEmail}: ${args.reason}`,
      settledAt: BigInt(now),
      settledBy: "ADMIN",
    });

    // Log audit
    await ctx.db.insert("audit_logs", {
      timestamp: BigInt(now),
      actorEmail: adminEmail,
      action: "WAGER_CANCEL_REFUND",
      metadata: JSON.stringify({ wagerId: args.wagerId, reason: args.reason }),
    });

    console.log(`🔄 [ADMIN] Wager ${args.wagerId} cancelled and refunded by ${adminEmail}`);

    return { success: true };
  },
});

/**
 * ADMIN: Force winner
 * Settles wager with specified winner
 */
export const adminForceWinner = mutation({
  args: {
    wagerId: v.id("wagers"),
    winnerId: v.id("users"),
    applyFee: v.boolean(), // Whether to apply 10% platform fee
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const isAdmin = await checkAdminPermission(ctx);
    if (!isAdmin) throw new Error("Unauthorized");

    const identity = await ctx.auth.getUserIdentity();
    const adminEmail = identity?.email || "unknown";

    const wager = await ctx.db.get(args.wagerId);
    if (!wager) throw new Error("Wager not found");

    // Can only force on active wagers
    if (wager.status === "FINISHED" || wager.status === "CANCELLED") {
      throw new Error("Wager já foi finalizado ou cancelado");
    }

    // Validate winner is part of wager
    if (args.winnerId !== wager.creatorId && args.winnerId !== wager.opponentId) {
      throw new Error("Winner deve ser um dos jogadores do wager");
    }

    const loserId = args.winnerId === wager.creatorId ? wager.opponentId : wager.creatorId;
    if (!loserId) throw new Error("Opponent not found");

    const now = Date.now();
    const totalPot = wager.totalPot;
    const platformFee = args.applyFee ? Math.floor(totalPot * 0.1) : 0;
    const winnerPrize = totalPot - platformFee;

    // Credit winner
    const winner = await ctx.db.get(args.winnerId);
    if (!winner) throw new Error("Winner not found");

    const winnerBalanceBefore = winner.balance ?? 0;
    const winnerBalanceAfter = winnerBalanceBefore + winnerPrize;
    await ctx.db.patch(winner._id, { balance: winnerBalanceAfter });

    await ctx.db.insert("wager_transactions", {
      wagerId: args.wagerId,
      userId: winner._id,
      type: "WIN",
      amount: winnerPrize,
      balanceBefore: winnerBalanceBefore,
      balanceAfter: winnerBalanceAfter,
      description: `Wager #${args.wagerId.slice(-6)} - Vitória (Admin)`,
      createdAt: BigInt(now),
    });

    // Record platform revenue if fee applied
    if (platformFee > 0) {
      await ctx.db.insert("platform_revenue", {
        source: "WAGER_FEE",
        wagerId: args.wagerId,
        amount: platformFee,
        description: `Taxa de serviço - Wager #${args.wagerId.slice(-6)} (Admin)`,
        createdAt: BigInt(now),
      });
    }

    // Update wager
    await ctx.db.patch(args.wagerId, {
      status: "FINISHED",
      winnerId: args.winnerId,
      loserId,
      platformFee,
      winnerPrize,
      settledAt: BigInt(now),
      settledBy: "ADMIN",
      adminNote: `Forçado por ${adminEmail}: ${args.reason}`,
    });

    // Log audit
    await ctx.db.insert("audit_logs", {
      timestamp: BigInt(now),
      actorEmail: adminEmail,
      action: "WAGER_FORCE_WINNER",
      metadata: JSON.stringify({
        wagerId: args.wagerId,
        winnerId: args.winnerId,
        applyFee: args.applyFee,
        reason: args.reason,
      }),
    });

    console.log(`⚡ [ADMIN] Wager ${args.wagerId} force-settled by ${adminEmail}. Winner: ${winner.nickname}`);

    return { success: true };
  },
});

/**
 * ADMIN: Mark as disputed
 */
export const adminMarkDisputed = mutation({
  args: {
    wagerId: v.id("wagers"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const isAdmin = await checkAdminPermission(ctx);
    if (!isAdmin) throw new Error("Unauthorized");

    const identity = await ctx.auth.getUserIdentity();
    const adminEmail = identity?.email || "unknown";

    const wager = await ctx.db.get(args.wagerId);
    if (!wager) throw new Error("Wager not found");

    await ctx.db.patch(args.wagerId, {
      status: "DISPUTED",
      adminNote: `Disputa marcada por ${adminEmail}: ${args.reason}`,
    });

    // Log audit
    await ctx.db.insert("audit_logs", {
      timestamp: BigInt(Date.now()),
      actorEmail: adminEmail,
      action: "WAGER_MARK_DISPUTED",
      metadata: JSON.stringify({ wagerId: args.wagerId, reason: args.reason }),
    });

    return { success: true };
  },
});

/**
 * Get platform revenue stats
 */
export const getRevenueStats = query({
  args: {},
  handler: async (ctx) => {
    const isAdmin = await checkAdminPermission(ctx);
    if (!isAdmin) return null;

    const allRevenue = await ctx.db.query("platform_revenue").collect();

    const totalRevenue = allRevenue.reduce((sum, r) => sum + r.amount, 0);
    const wagerFees = allRevenue
      .filter((r) => r.source === "WAGER_FEE")
      .reduce((sum, r) => sum + r.amount, 0);

    // Get wager stats
    const allWagers = await ctx.db.query("wagers").collect();
    const finishedWagers = allWagers.filter((w) => w.status === "FINISHED");
    const totalWagered = finishedWagers.reduce((sum, w) => sum + w.totalPot, 0);

    return {
      totalRevenue,
      wagerFees,
      totalWagers: allWagers.length,
      finishedWagers: finishedWagers.length,
      totalWagered,
      activeWagers: allWagers.filter((w) => ["WAITING", "LOCKED", "LIVE"].includes(w.status)).length,
    };
  },
});

/**
 * Get recent transactions for admin
 */
export const getRecentTransactions = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const isAdmin = await checkAdminPermission(ctx);
    if (!isAdmin) return [];

    const transactions = await ctx.db
      .query("wager_transactions")
      .order("desc")
      .take(args.limit || 50);

    // Enrich with user info
    const enriched = await Promise.all(
      transactions.map(async (tx) => {
        const user = await ctx.db.get(tx.userId);
        return {
          ...tx,
          userName: user?.nickname || user?.steamName,
        };
      })
    );

    return enriched;
  },
});
