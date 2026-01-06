import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * FASE 37: AUDIT LOG SYSTEM
 * Deep logging for all critical admin actions
 */

export const logAction = mutation({
  args: {
    action: v.string(),
    targetUserId: v.optional(v.id("users")),
    targetEmail: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return; // Skip logging if not authenticated
    }

    const actor = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    await ctx.db.insert("audit_logs", {
      timestamp: BigInt(Date.now()),
      actorId: actor?._id,
      actorEmail: identity.email || "unknown",
      action: args.action,
      targetUserId: args.targetUserId,
      targetEmail: args.targetEmail,
      metadata: args.metadata ? JSON.stringify(args.metadata) : undefined,
    });
  },
});

export const getAuditLogs = query({
  args: {
    limit: v.optional(v.number()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if admin
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "ADMIN") {
      throw new Error("Admin access required");
    }

    let query = ctx.db.query("audit_logs").order("desc");

    // Filter by user if specified
    if (args.userId) {
      const logs = await query.collect();
      const filtered = logs.filter(
        (log) => log.actorId === args.userId || log.targetUserId === args.userId
      );
      return filtered.slice(0, args.limit || 100);
    }

    const logs = await query.take(args.limit || 100);

    return logs.map((log) => ({
      _id: log._id,
      timestamp: log.timestamp,
      actorEmail: log.actorEmail,
      action: log.action,
      targetEmail: log.targetEmail,
      metadata: log.metadata,
    }));
  },
});
