import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * FASE 54: WAGERS SYSTEM (P2P BETTING)
 * Play for money with automatic fund locking and settlement
 */

const PLATFORM_FEE_PERCENT = 10; // 10% fee
const WAGER_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const WAGER_MAPS = [
  { id: "aim_map", name: "Aim Map", image: "/maps/aim.jpg" },
  { id: "awp_lego", name: "AWP Lego", image: "/maps/awp_lego.jpg" },
  { id: "aim_redline", name: "Aim Redline", image: "/maps/redline.jpg" },
  { id: "aim_deagle", name: "Aim Deagle", image: "/maps/deagle.jpg" },
  { id: "awp_india", name: "AWP India", image: "/maps/awp_india.jpg" },
];

/**
 * Get available wager maps
 */
export const getWagerMaps = query({
  args: {},
  handler: async () => {
    return WAGER_MAPS;
  },
});

/**
 * Get user's current balance
 */
export const getMyBalance = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user?.balance ?? 0;
  },
});

/**
 * Get open wagers (WAITING status)
 */
export const getOpenWagers = query({
  args: {},
  handler: async (ctx) => {
    const wagers = await ctx.db
      .query("wagers")
      .withIndex("by_status", (q) => q.eq("status", "WAITING"))
      .order("desc")
      .collect();

    // Filter out expired wagers
    const now = Date.now();
    const activeWagers = wagers.filter((w) => Number(w.expiresAt) > now);

    // Enrich with creator info
    const enriched = await Promise.all(
      activeWagers.map(async (wager) => {
        const creator = await ctx.db.get(wager.creatorId);
        return {
          ...wager,
          creator: {
            _id: creator?._id,
            nickname: creator?.nickname || creator?.steamName,
            steamAvatar: creator?.steamAvatar,
            elo: creator?.elo_1v1,
          },
        };
      })
    );

    return enriched;
  },
});

/**
 * Get my active wagers (created or joined)
 */
export const getMyWagers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    // Get wagers I created
    const created = await ctx.db
      .query("wagers")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .collect();

    // Get wagers I joined
    const joined = await ctx.db
      .query("wagers")
      .withIndex("by_opponent", (q) => q.eq("opponentId", user._id))
      .collect();

    const allWagers = [...created, ...joined];

    // Enrich with player info
    const enriched = await Promise.all(
      allWagers.map(async (wager) => {
        const creator = await ctx.db.get(wager.creatorId);
        const opponent = wager.opponentId ? await ctx.db.get(wager.opponentId) : null;
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
        };
      })
    );

    return enriched.sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  },
});

/**
 * Get wager by ID
 */
export const getWager = query({
  args: { wagerId: v.id("wagers") },
  handler: async (ctx, args) => {
    const wager = await ctx.db.get(args.wagerId);
    if (!wager) return null;

    const creator = await ctx.db.get(wager.creatorId);
    const opponent = wager.opponentId ? await ctx.db.get(wager.opponentId) : null;
    const winner = wager.winnerId ? await ctx.db.get(wager.winnerId) : null;

    return {
      ...wager,
      creator: {
        _id: creator?._id,
        nickname: creator?.nickname || creator?.steamName,
        steamAvatar: creator?.steamAvatar,
        elo: creator?.elo_1v1,
      },
      opponent: opponent
        ? {
            _id: opponent._id,
            nickname: opponent.nickname || opponent.steamName,
            steamAvatar: opponent.steamAvatar,
            elo: opponent.elo_1v1,
          }
        : null,
      winner: winner
        ? {
            _id: winner._id,
            nickname: winner.nickname || winner.steamName,
          }
        : null,
    };
  },
});

/**
 * CREATE WAGER - Lock funds and create lobby
 */
export const createWager = mutation({
  args: {
    map: v.string(),
    mode: v.union(v.literal("1v1"), v.literal("2v2")),
    betAmount: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Validate bet amount (minimum 100 Soberanas)
    if (args.betAmount < 100) {
      throw new Error("Aposta mínima: 100 Ⓢ");
    }

    // Validate balance
    const currentBalance = user.balance ?? 0;
    if (currentBalance < args.betAmount) {
      throw new Error(`Saldo insuficiente. Tens ${currentBalance} Ⓢ, precisas de ${args.betAmount} Ⓢ`);
    }

    // Check if user already has an active wager
    const existingWager = await ctx.db
      .query("wagers")
      .withIndex("by_creator", (q) => q.eq("creatorId", user._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "WAITING"),
          q.eq(q.field("status"), "LOCKED"),
          q.eq(q.field("status"), "LIVE")
        )
      )
      .first();

    if (existingWager) {
      throw new Error("Já tens um wager ativo. Cancela ou termina antes de criar outro.");
    }

    const now = Date.now();
    const newBalance = currentBalance - args.betAmount;

    // ATOMIC: Lock funds
    await ctx.db.patch(user._id, { balance: newBalance });

    // Create wager
    const wagerId = await ctx.db.insert("wagers", {
      creatorId: user._id,
      creatorLockedAmount: args.betAmount,
      mode: args.mode,
      map: args.map,
      betAmount: args.betAmount,
      totalPot: args.betAmount, // Will double when opponent joins
      platformFeePercent: PLATFORM_FEE_PERCENT,
      status: "WAITING",
      createdAt: BigInt(now),
      expiresAt: BigInt(now + WAGER_TIMEOUT_MS),
    });

    // Record transaction
    await ctx.db.insert("wager_transactions", {
      wagerId,
      userId: user._id,
      type: "LOCK",
      amount: args.betAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Wager #${wagerId.slice(-6)} - Fundos bloqueados`,
      createdAt: BigInt(now),
    });

    // Schedule auto-cancel timeout
    await ctx.scheduler.runAfter(WAGER_TIMEOUT_MS, internal.wagers.autoExpireWager, {
      wagerId,
    });

    console.log(`💰 [WAGER] Created by ${user.nickname}: ${args.betAmount} Ⓢ on ${args.map}`);

    return { wagerId, balance: newBalance };
  },
});

/**
 * JOIN WAGER - Lock opponent funds and start match
 */
export const joinWager = mutation({
  args: { wagerId: v.id("wagers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const wager = await ctx.db.get(args.wagerId);
    if (!wager) throw new Error("Wager not found");

    // Validations
    if (wager.status !== "WAITING") {
      throw new Error("Este wager já não está disponível");
    }

    if (wager.creatorId === user._id) {
      throw new Error("Não podes aceitar o teu próprio wager");
    }

    if (Number(wager.expiresAt) < Date.now()) {
      throw new Error("Este wager expirou");
    }

    // Validate balance
    const currentBalance = user.balance ?? 0;
    if (currentBalance < wager.betAmount) {
      throw new Error(`Saldo insuficiente. Tens ${currentBalance} Ⓢ, precisas de ${wager.betAmount} Ⓢ`);
    }

    const now = Date.now();
    const newBalance = currentBalance - wager.betAmount;
    const totalPot = wager.betAmount * 2;

    // ATOMIC: Lock opponent funds
    await ctx.db.patch(user._id, { balance: newBalance });

    // Update wager status
    await ctx.db.patch(args.wagerId, {
      opponentId: user._id,
      opponentLockedAmount: wager.betAmount,
      totalPot,
      status: "LOCKED",
    });

    // Record transaction
    await ctx.db.insert("wager_transactions", {
      wagerId: args.wagerId,
      userId: user._id,
      type: "LOCK",
      amount: wager.betAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Wager #${args.wagerId.slice(-6)} - Fundos bloqueados`,
      createdAt: BigInt(now),
    });

    console.log(`💰 [WAGER] Joined by ${user.nickname}: ${wager.betAmount} Ⓢ`);

    // Trigger server creation
    await ctx.scheduler.runAfter(0, internal.wagers.createWagerServer, {
      wagerId: args.wagerId,
    });

    return { wagerId: args.wagerId, balance: newBalance };
  },
});

/**
 * CANCEL WAGER - Only creator can cancel while WAITING
 */
export const cancelWager = mutation({
  args: { wagerId: v.id("wagers") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const wager = await ctx.db.get(args.wagerId);
    if (!wager) throw new Error("Wager not found");

    // Only creator can cancel
    if (wager.creatorId !== user._id) {
      throw new Error("Apenas o criador pode cancelar");
    }

    // Can only cancel while waiting
    if (wager.status !== "WAITING") {
      throw new Error("Não é possível cancelar. O wager já foi aceite.");
    }

    const now = Date.now();
    const currentBalance = user.balance ?? 0;
    const newBalance = currentBalance + wager.creatorLockedAmount;

    // ATOMIC: Unlock funds
    await ctx.db.patch(user._id, { balance: newBalance });

    // Update wager status
    await ctx.db.patch(args.wagerId, {
      status: "CANCELLED",
      cancelReason: "Cancelado pelo criador",
    });

    // Record transaction
    await ctx.db.insert("wager_transactions", {
      wagerId: args.wagerId,
      userId: user._id,
      type: "UNLOCK",
      amount: wager.creatorLockedAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Wager #${args.wagerId.slice(-6)} - Cancelado`,
      createdAt: BigInt(now),
    });

    console.log(`❌ [WAGER] Cancelled by ${user.nickname}`);

    return { balance: newBalance };
  },
});

/**
 * AUTO-EXPIRE WAGER (Internal - called by scheduler)
 */
export const autoExpireWager = internalMutation({
  args: { wagerId: v.id("wagers") },
  handler: async (ctx, args) => {
    const wager = await ctx.db.get(args.wagerId);
    if (!wager) return;

    // Only expire if still waiting
    if (wager.status !== "WAITING") return;

    const creator = await ctx.db.get(wager.creatorId);
    if (!creator) return;

    const now = Date.now();
    const currentBalance = creator.balance ?? 0;
    const newBalance = currentBalance + wager.creatorLockedAmount;

    // Unlock funds
    await ctx.db.patch(creator._id, { balance: newBalance });

    // Update wager status
    await ctx.db.patch(args.wagerId, {
      status: "CANCELLED",
      cancelReason: "Expirado (timeout 10min)",
    });

    // Record transaction
    await ctx.db.insert("wager_transactions", {
      wagerId: args.wagerId,
      userId: creator._id,
      type: "UNLOCK",
      amount: wager.creatorLockedAmount,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      description: `Wager #${args.wagerId.slice(-6)} - Expirado`,
      createdAt: BigInt(now),
    });

    console.log(`⏰ [WAGER] Auto-expired: ${args.wagerId}`);
  },
});

/**
 * CREATE WAGER SERVER (Internal - creates game server)
 */
export const createWagerServer = internalMutation({
  args: { wagerId: v.id("wagers") },
  handler: async (ctx, args) => {
    const wager = await ctx.db.get(args.wagerId);
    if (!wager || wager.status !== "LOCKED") return;

    const creator = await ctx.db.get(wager.creatorId);
    const opponent = wager.opponentId ? await ctx.db.get(wager.opponentId) : null;

    if (!creator || !opponent) return;

    // Create a match record (wagers are 1v1 only)
    const matchId = await ctx.db.insert("matches", {
      state: "CONFIGURING",
      mode: "1v1" as const,
      teamA: [creator._id],
      teamB: [opponent._id],
      mapPool: [wager.map],
      bannedMaps: [],
      selectedMap: wager.map,
    });

    // Update wager with match link
    await ctx.db.patch(args.wagerId, {
      matchId,
      status: "LIVE",
    });

    console.log(`🎮 [WAGER] Server created for wager ${args.wagerId}, match ${matchId}`);

    // In production, this would call the Game Server Manager
    // await ctx.scheduler.runAfter(0, internal.serverManager.createServer, { matchId, isWager: true });
  },
});

/**
 * SETTLE WAGER - Called when match ends
 */
export const settleWager = internalMutation({
  args: {
    wagerId: v.id("wagers"),
    winnerId: v.id("users"),
    loserId: v.id("users"),
    winnerScore: v.float64(),
    loserScore: v.float64(),
  },
  handler: async (ctx, args) => {
    const wager = await ctx.db.get(args.wagerId);
    if (!wager) throw new Error("Wager not found");

    if (wager.status !== "LIVE") {
      throw new Error("Wager is not in LIVE status");
    }

    const winner = await ctx.db.get(args.winnerId);
    const loser = await ctx.db.get(args.loserId);

    if (!winner || !loser) throw new Error("Players not found");

    const now = Date.now();
    const totalPot = wager.totalPot;
    const platformFee = Math.floor(totalPot * (PLATFORM_FEE_PERCENT / 100));
    const winnerPrize = totalPot - platformFee;

    // Credit winner
    const winnerBalanceBefore = winner.balance ?? 0;
    const winnerBalanceAfter = winnerBalanceBefore + winnerPrize;
    await ctx.db.patch(winner._id, { balance: winnerBalanceAfter });

    // Record winner transaction
    await ctx.db.insert("wager_transactions", {
      wagerId: args.wagerId,
      userId: winner._id,
      type: "WIN",
      amount: winnerPrize,
      balanceBefore: winnerBalanceBefore,
      balanceAfter: winnerBalanceAfter,
      description: `Wager #${args.wagerId.slice(-6)} - Vitória! (+${winnerPrize} Ⓢ)`,
      createdAt: BigInt(now),
    });

    // Record platform revenue
    await ctx.db.insert("platform_revenue", {
      source: "WAGER_FEE",
      wagerId: args.wagerId,
      amount: platformFee,
      description: `Taxa de serviço 10% - Wager #${args.wagerId.slice(-6)}`,
      createdAt: BigInt(now),
    });

    // Update wager as finished
    await ctx.db.patch(args.wagerId, {
      status: "FINISHED",
      winnerId: args.winnerId,
      loserId: args.loserId,
      winnerScore: args.winnerScore,
      loserScore: args.loserScore,
      platformFee,
      winnerPrize,
      settledAt: BigInt(now),
      settledBy: "AUTO",
    });

    console.log(`🏆 [WAGER] Settled! Winner: ${winner.nickname} (+${winnerPrize} Ⓢ), Fee: ${platformFee} Ⓢ`);
  },
});

/**
 * Get wager history
 */
export const getWagerHistory = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const limit = args.limit || 20;

    // Get finished wagers
    const wagers = await ctx.db
      .query("wagers")
      .withIndex("by_status", (q) => q.eq("status", "FINISHED"))
      .order("desc")
      .take(100);

    // Filter to user's wagers
    const myWagers = wagers.filter(
      (w) => w.creatorId === user._id || w.opponentId === user._id
    ).slice(0, limit);

    // Enrich with player info
    const enriched = await Promise.all(
      myWagers.map(async (wager) => {
        const creator = await ctx.db.get(wager.creatorId);
        const opponent = wager.opponentId ? await ctx.db.get(wager.opponentId) : null;
        const isWinner = wager.winnerId === user._id;

        return {
          ...wager,
          isWinner,
          creator: {
            _id: creator?._id,
            nickname: creator?.nickname || creator?.steamName,
          },
          opponent: opponent
            ? {
                _id: opponent._id,
                nickname: opponent.nickname || opponent.steamName,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get my transaction history
 */
export const getMyTransactions = query({
  args: { limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const transactions = await ctx.db
      .query("wager_transactions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.limit || 50);

    return transactions;
  },
});
