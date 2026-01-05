import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";

// Admin email - Configure this with your email
// TODO: Move to Convex environment variables in production
const ADMIN_EMAIL = "marstrabalhar@gmail.com";

/**
 * Check if the current user is an admin
 * Throws error if not authenticated or not admin
 */
export async function checkAdmin(ctx: QueryCtx | MutationCtx): Promise<void> {
  const identity = await ctx.auth.getUserIdentity();
  
  if (!identity) {
    throw new Error("Not authenticated");
  }

  // Check if user email matches admin email
  if (identity.email !== ADMIN_EMAIL) {
    throw new Error("Unauthorized: Admin access required");
  }
}

/**
 * Check if current user is admin (returns boolean)
 */
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      return false;
    }

    return identity.email === ADMIN_EMAIL;
  },
});

/**
 * Get all users (Admin only)
 */
export const getAllUsers = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    let users = await ctx.db.query("users").collect();

    // Filter by search term if provided
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.clerkId.toLowerCase().includes(searchLower) ||
          u.steamId.includes(searchLower)
      );
    }

    return users;
  },
});

/**
 * Ban/Unban a user (Admin only)
 */
export const toggleUserBan = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      isBanned: !user.isBanned,
    });

    return { success: true, newStatus: !user.isBanned };
  },
});

/**
 * Manually adjust user ELO (Admin only)
 */
export const adjustUserElo = mutation({
  args: {
    userId: v.id("users"),
    mode: v.union(v.literal("1v1"), v.literal("5v5")),
    newElo: v.float64(),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    const field = args.mode === "1v1" ? "elo_1v1" : "elo_5v5";
    await ctx.db.patch(args.userId, {
      [field]: args.newElo,
    });

    return { success: true };
  },
});

/**
 * Get all live matches (Admin only)
 */
export const getLiveMatches = query({
  args: {},
  handler: async (ctx) => {
    await checkAdmin(ctx);

    const matches = await ctx.db
      .query("matches")
      .filter((q) =>
        q.or(
          q.eq(q.field("state"), "WARMUP"),
          q.eq(q.field("state"), "LIVE")
        )
      )
      .collect();

    // Enrich with player data
    const enrichedMatches = await Promise.all(
      matches.map(async (match) => {
        const teamAPlayers = await Promise.all(
          match.teamA.map((id) => ctx.db.get(id))
        );
        const teamBPlayers = await Promise.all(
          match.teamB.map((id) => ctx.db.get(id))
        );

        return {
          ...match,
          teamAPlayers: teamAPlayers.filter((p) => p !== null),
          teamBPlayers: teamBPlayers.filter((p) => p !== null),
        };
      })
    );

    return enrichedMatches;
  },
});

/**
 * Force cancel a match (Admin only - PANIC BUTTON)
 */
export const forceCancelMatch = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    // Update match state to CANCELLED
    await ctx.db.patch(args.matchId, {
      state: "CANCELLED",
    });

    // TODO: Trigger server cleanup if needed
    // This would call the DatHost API to stop/delete the server

    return { success: true };
  },
});

/**
 * Get system logs (Admin only)
 */
export const getSystemLogs = query({
  args: {
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    await checkAdmin(ctx);

    const limit = args.limit || 50;

    // Get recent matches as "logs"
    const matches = await ctx.db
      .query("matches")
      .order("desc")
      .take(limit);

    return matches.map((match) => ({
      _id: match._id,
      timestamp: match._creationTime,
      type: "MATCH",
      state: match.state,
      mode: match.mode,
      map: match.selectedMap,
    }));
  },
});
