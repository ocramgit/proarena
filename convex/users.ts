import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

const ADMIN_EMAIL = "marstrabalhar@gmail.com";

export const storeUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return existingUser._id;
    }

    // Check if user should be admin based on email
    const isAdmin = args.email === ADMIN_EMAIL;

    const userId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      steamId: "",
      role: isAdmin ? "ADMIN" : "USER",
      elo_1v1: 1000,
      elo_5v5: 1000,
      isBanned: false,
      isPremium: false,
    });

    if (isAdmin) {
      console.log("👑 Admin user created:", args.email);
    }

    return userId;
  },
});

export const getCurrentUser = query({
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

    return user;
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * FASE 29: Get user by nickname for @username routing
 * Falls back to steamName if nickname not found
 */
export const getUserByNickname = query({
  args: { nickname: v.string() },
  handler: async (ctx, args) => {
    // Try nickname first
    let user = await ctx.db
      .query("users")
      .withIndex("by_nickname", (q) => q.eq("nickname", args.nickname))
      .first();
    
    // If not found, try steamName (for users without nickname set)
    if (!user) {
      const allUsers = await ctx.db.query("users").collect();
      user = allUsers.find(u => 
        u.steamName?.replace(/\s+/g, '_') === args.nickname || 
        u.steamName === args.nickname
      ) || null;
    }
    
    return user;
  },
});

export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    return user;
  },
});

export const checkNicknameAvailable = query({
  args: { nickname: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_nickname", (q) => q.eq("nickname", args.nickname))
      .first();

    return !existing; // true if available, false if taken
  },
});

export const setNickname = mutation({
  args: { nickname: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Validate nickname format
    if (args.nickname.length < 3 || args.nickname.length > 20) {
      throw new Error("Nickname deve ter entre 3 e 20 caracteres");
    }

    if (!/^[a-zA-Z0-9_]+$/.test(args.nickname)) {
      throw new Error("Nickname só pode conter letras, números e _");
    }

    // Check if nickname is available
    const existing = await ctx.db
      .query("users")
      .withIndex("by_nickname", (q) => q.eq("nickname", args.nickname))
      .first();

    if (existing) {
      throw new Error("Este nickname já está em uso");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Update nickname
    await ctx.db.patch(user._id, {
      nickname: args.nickname,
    });

    return { success: true };
  },
});

export const getMyProfile = query({
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

    // PHASE 12: Calculate stats from FINISHED matches only (CANCELLED excluded)
    const allMatches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "FINISHED"))
      .collect();

    const myMatches = allMatches.filter(
      (match) => match.teamA.includes(user._id) || match.teamB.includes(user._id)
    );

    const wins = myMatches.filter((match) => {
      const isInTeamA = match.teamA.includes(user._id);
      const isInTeamB = match.teamB.includes(user._id);
      return (isInTeamA && match.winnerId && match.teamA.includes(match.winnerId)) ||
             (isInTeamB && match.winnerId && match.teamB.includes(match.winnerId));
    }).length;

    const totalMatches = myMatches.length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;

    return {
      ...user,
      stats: {
        totalMatches,
        wins,
        losses,
        winRate,
      },
    };
  },
});

export const getLeaderboard = query({
  args: {
    mode: v.optional(v.union(v.literal("1v1"), v.literal("5v5"))),
  },
  handler: async (ctx, args) => {
    const mode = args.mode || "5v5";
    const eloField = mode === "1v1" ? "elo_1v1" : "elo_5v5";

    const users = await ctx.db.query("users").collect();

    const sorted = users
      .filter((u) => !u.isBanned)
      .sort((a, b) => b[eloField] - a[eloField])
      .slice(0, 50);

    return sorted.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      clerkId: user.clerkId,
      elo_1v1: user.elo_1v1,
      elo_5v5: user.elo_5v5,
      steamId: user.steamId,
      isPremium: user.isPremium,
    }));
  },
});

export const updateSteamId = mutation({
  args: {
    steamId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      steamId: args.steamId,
    });

    return user._id;
  },
});

/**
 * Link Steam account to user
 * Called from API route after Steam OpenID validation
 */
export const linkSteamAccount = mutation({
  args: {
    clerkId: v.string(),
    steamId: v.string(),
    steamName: v.string(),
    steamAvatar: v.string(),
    steamProfileUrl: v.string(),
  },
  handler: async (ctx, args) => {
    console.log("🔗 Linking Steam account for Clerk ID:", args.clerkId);

    // Find user by Clerk ID
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if Steam ID is already linked to another account
    const existingSteamUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("steamId"), args.steamId))
      .first();

    if (existingSteamUser && existingSteamUser._id !== user._id) {
      throw new Error("This Steam account is already linked to another user");
    }

    // Update user with Steam data
    await ctx.db.patch(user._id, {
      steamId: args.steamId,
      steamName: args.steamName,
      steamAvatar: args.steamAvatar,
      steamProfileUrl: args.steamProfileUrl,
    });

    console.log("✅ Steam account linked successfully:", args.steamName);

    // Trigger Steam data update (hours, trust, etc.)
    await ctx.scheduler.runAfter(0, internal.steamApi.updateSteamData, {
      userId: user._id,
      steamId: args.steamId,
    });

    console.log("✅ Scheduled Steam data update for:", args.steamName);

    return { success: true, userId: user._id };
  },
});
