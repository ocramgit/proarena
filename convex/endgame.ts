// This file is deprecated - all endgame logic moved to matchResults.ts
// Only cancelMatch remains for warmup timeout handling

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const cancelMatch = internalMutation({
  args: {
    matchId: v.id("matches"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    // Update match state to CANCELLED
    await ctx.db.patch(args.matchId, {
      state: "CANCELLED",
      finishedAt: BigInt(Date.now()),
    });

    console.log("Match cancelled:", args.matchId, "Reason:", args.reason);

    // Schedule server cleanup if there's a server
    if (match.dathostServerId) {
      await ctx.scheduler.runAfter(1000, internal.matchResults.cleanupServer, {
        matchId: args.matchId,
      });
    }
  },
});
