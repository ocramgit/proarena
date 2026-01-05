import { v } from "convex/values";
import { mutation } from "./_generated/server";

/**
 * ATOMIC LOCK SYSTEM
 * Acquires lock atomically before provisioning can start
 * This prevents race conditions where 2 calls happen simultaneously
 */

export const requestProvisioning = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    
    if (!match) {
      throw new Error("Match not found");
    }

    // ATOMIC CHECK: If already provisioning or provisioned, reject immediately
    if (match.serverIp || match.provisioningStarted) {
      console.warn(`⚠️ [ATOMIC LOCK] Match ${args.matchId} already locked - REJECTING`);
      return { success: false, reason: "already_provisioning" };
    }

    // ATOMIC LOCK: Set lock immediately in mutation
    // This is atomic - only ONE mutation can succeed
    await ctx.db.patch(args.matchId, {
      provisioningStarted: true,
    });

    console.log(`✅ [ATOMIC LOCK] Lock acquired for match ${args.matchId} - Client can now call action`);

    return { success: true };
  },
});
