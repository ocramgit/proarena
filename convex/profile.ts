import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * FASE 54: PROFILE 3.0 - THE DEFINITIVE IDENTITY
 * @handle system with Bento Grid layout
 */

/**
 * Get profile by @handle (nickname)
 */
export const getProfileByHandle = query({
  args: { handle: v.string() },
  handler: async (ctx, args) => {
    // Remove @ if present
    const nickname = args.handle.startsWith("@") ? args.handle.slice(1) : args.handle;

    const user = await ctx.db
      .query("users")
      .withIndex("by_nickname", (q) => q.eq("nickname", nickname))
      .first();

    if (!user) return null;

    // Get skill stats
    const skillStats = await ctx.db
      .query("user_skill_stats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    // Get badges
    const badges = await ctx.db
      .query("user_badges")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get org membership
    const orgMembership = await ctx.db
      .query("org_members")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    let org = null;
    if (orgMembership) {
      org = await ctx.db.get(orgMembership.orgId);
    }

    // Get tournament wins (trophies)
    const tournamentWins = await ctx.db
      .query("tournaments")
      .filter((q) => q.eq(q.field("winnerId"), user._id))
      .collect();

    // Get recent matches
    const recentStats = await ctx.db
      .query("player_stats")
      .withIndex("by_user_match", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(10);

    // Calculate ELO rank tier
    const eloTier = getEloTier(user.elo_5v5);

    return {
      _id: user._id,
      nickname: user.nickname,
      steamName: user.steamName,
      steamAvatar: user.steamAvatar,
      steamProfileUrl: user.steamProfileUrl,
      country: user.country,
      bio: user.bio,
      // Ranks
      elo_1v1: user.elo_1v1,
      elo_5v5: user.elo_5v5,
      eloTier,
      // Status
      isPremium: user.isPremium,
      isVerified: user.isVerified,
      isBanned: user.isBanned,
      role: user.role,
      // Stats
      matchesPlayed: user.matchesPlayed || 0,
      trustScore: user.trustScore,
      steamHours: user.steamHours,
      // Customization
      profileBannerUrl: user.profileBannerUrl,
      themeColor: user.themeColor || "amber",
      // Setup
      crosshairCode: user.crosshairCode,
      resolution: user.resolution,
      aspectRatio: user.aspectRatio,
      mouseDpi: user.mouseDpi,
      sensitivity: user.sensitivity,
      mouseModel: user.mouseModel,
      keyboardModel: user.keyboardModel,
      monitorModel: user.monitorModel,
      headsetModel: user.headsetModel,
      // Related data
      skillStats,
      badges,
      org: org ? { _id: org._id, name: org.name, tag: org.tag, logoUrl: org.logoUrl } : null,
      orgRole: orgMembership?.role,
      tournamentWins: tournamentWins.map((t) => ({
        _id: t._id,
        name: t.name,
        finishedAt: t.updatedAt,
      })),
      recentMatches: recentStats.length,
    };
  },
});

/**
 * Get ELO tier from rating
 */
function getEloTier(elo: number): { name: string; color: string; icon: string } {
  if (elo >= 2500) return { name: "Global Elite", color: "#FFD700", icon: "🏆" };
  if (elo >= 2200) return { name: "Supreme", color: "#FF6B6B", icon: "⭐" };
  if (elo >= 1900) return { name: "LEM", color: "#9B59B6", icon: "💎" };
  if (elo >= 1600) return { name: "DMG", color: "#3498DB", icon: "🔷" };
  if (elo >= 1300) return { name: "MG", color: "#2ECC71", icon: "🟢" };
  if (elo >= 1000) return { name: "Gold Nova", color: "#F39C12", icon: "🟡" };
  if (elo >= 700) return { name: "Silver Elite", color: "#95A5A6", icon: "⚪" };
  return { name: "Silver", color: "#7F8C8D", icon: "🔘" };
}

/**
 * Get wager stats for profile
 */
export const getWagerStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all finished wagers involving this user
    const asCreator = await ctx.db
      .query("wagers")
      .withIndex("by_creator", (q) => q.eq("creatorId", args.userId))
      .filter((q) => q.eq(q.field("status"), "FINISHED"))
      .collect();

    const asOpponent = await ctx.db
      .query("wagers")
      .withIndex("by_opponent", (q) => q.eq("opponentId", args.userId))
      .filter((q) => q.eq(q.field("status"), "FINISHED"))
      .collect();

    const allWagers = [...asCreator, ...asOpponent];

    let totalWagered = 0;
    let totalWon = 0;
    let totalLost = 0;
    let biggestPot = 0;
    let wins = 0;
    let losses = 0;
    const recentResults: { won: boolean; amount: number }[] = [];

    for (const wager of allWagers) {
      totalWagered += wager.betAmount;
      const isWinner = wager.winnerId === args.userId;

      if (isWinner) {
        wins++;
        totalWon += wager.winnerPrize || 0;
        if (wager.totalPot > biggestPot) biggestPot = wager.totalPot;
      } else {
        losses++;
        totalLost += wager.betAmount;
      }

      recentResults.push({
        won: isWinner,
        amount: isWinner ? (wager.winnerPrize || 0) - wager.betAmount : -wager.betAmount,
      });
    }

    // Sort by most recent and take last 10
    const last10 = recentResults.slice(-10);

    return {
      totalWagered,
      totalWon,
      totalLost,
      netProfit: totalWon - totalLost - totalWagered,
      biggestPot,
      wins,
      losses,
      winRate: allWagers.length > 0 ? Math.round((wins / allWagers.length) * 100) : 0,
      recentResults: last10,
    };
  },
});

/**
 * Get guestbook comments
 */
export const getGuestbook = query({
  args: { profileUserId: v.id("users"), limit: v.optional(v.float64()) },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("profile_guestbook")
      .withIndex("by_profile", (q) => q.eq("profileUserId", args.profileUserId))
      .order("desc")
      .take(args.limit || 20);

    // Filter deleted and enrich with author info
    const enriched = await Promise.all(
      comments
        .filter((c) => !c.isDeleted)
        .map(async (comment) => {
          const author = await ctx.db.get(comment.authorId);
          return {
            ...comment,
            author: {
              _id: author?._id,
              nickname: author?.nickname || author?.steamName,
              steamAvatar: author?.steamAvatar,
            },
          };
        })
    );

    return enriched;
  },
});

/**
 * Post guestbook comment
 */
export const postGuestbookComment = mutation({
  args: {
    profileUserId: v.id("users"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    // Validate content length
    if (args.content.length < 1 || args.content.length > 200) {
      throw new Error("Comentário deve ter entre 1 e 200 caracteres");
    }

    // Check rate limit (1 comment per profile per hour)
    const recentComment = await ctx.db
      .query("profile_guestbook")
      .withIndex("by_author", (q) => q.eq("authorId", user._id))
      .filter((q) => q.eq(q.field("profileUserId"), args.profileUserId))
      .order("desc")
      .first();

    if (recentComment) {
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (Number(recentComment.createdAt) > hourAgo) {
        throw new Error("Podes deixar 1 comentário por hora neste perfil");
      }
    }

    await ctx.db.insert("profile_guestbook", {
      profileUserId: args.profileUserId,
      authorId: user._id,
      content: args.content,
      createdAt: BigInt(Date.now()),
    });

    return { success: true };
  },
});

/**
 * Delete guestbook comment (owner only)
 */
export const deleteGuestbookComment = mutation({
  args: { commentId: v.id("profile_guestbook") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new Error("Comment not found");

    // Only profile owner can delete
    if (comment.profileUserId !== user._id) {
      throw new Error("Apenas o dono do perfil pode apagar comentários");
    }

    await ctx.db.patch(args.commentId, { isDeleted: true });

    return { success: true };
  },
});

/**
 * Update profile customization
 */
export const updateProfileCustomization = mutation({
  args: {
    profileBannerUrl: v.optional(v.string()),
    themeColor: v.optional(v.string()),
    country: v.optional(v.string()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const updates: any = {};
    if (args.profileBannerUrl !== undefined) updates.profileBannerUrl = args.profileBannerUrl;
    if (args.themeColor !== undefined) updates.themeColor = args.themeColor;
    if (args.country !== undefined) updates.country = args.country;
    if (args.bio !== undefined) {
      if (args.bio.length > 300) throw new Error("Bio máximo 300 caracteres");
      updates.bio = args.bio;
    }

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Update setup/peripherals
 */
export const updateSetup = mutation({
  args: {
    crosshairCode: v.optional(v.string()),
    resolution: v.optional(v.string()),
    aspectRatio: v.optional(v.string()),
    mouseDpi: v.optional(v.float64()),
    sensitivity: v.optional(v.float64()),
    mouseModel: v.optional(v.string()),
    keyboardModel: v.optional(v.string()),
    monitorModel: v.optional(v.string()),
    headsetModel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const updates: any = {};
    if (args.crosshairCode !== undefined) updates.crosshairCode = args.crosshairCode;
    if (args.resolution !== undefined) updates.resolution = args.resolution;
    if (args.aspectRatio !== undefined) updates.aspectRatio = args.aspectRatio;
    if (args.mouseDpi !== undefined) updates.mouseDpi = args.mouseDpi;
    if (args.sensitivity !== undefined) updates.sensitivity = args.sensitivity;
    if (args.mouseModel !== undefined) updates.mouseModel = args.mouseModel;
    if (args.keyboardModel !== undefined) updates.keyboardModel = args.keyboardModel;
    if (args.monitorModel !== undefined) updates.monitorModel = args.monitorModel;
    if (args.headsetModel !== undefined) updates.headsetModel = args.headsetModel;

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

/**
 * Check if current user is viewing their own profile
 */
export const isOwnProfile = query({
  args: { profileUserId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    return user?._id === args.profileUserId;
  },
});

/**
 * Get current user's skill stats (for comparison)
 */
export const getMySkillStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    return ctx.db
      .query("user_skill_stats")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});
