import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * PRIORIDADE MÉDIA: SERVER COST TRACKING
 * Tracking automático de custos de servidor DatHost
 * 
 * Pricing DatHost (cs2-matches):
 * - Hourly billing: €0.17/hour (1v1 servers)
 * - Match duration average: ~30 minutes
 * - Estimated cost per match: ~€0.085
 */

const DATHOST_HOURLY_RATE = 0.17; // EUR per hour
const ESTIMATED_MATCH_DURATION_HOURS = 0.5; // 30 minutes average

/**
 * Calculate and record server cost for a match
 */
export const recordServerCost = internalMutation({
  args: {
    matchId: v.id("matches"),
    actualDurationMinutes: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    // Calculate duration
    let durationHours = ESTIMATED_MATCH_DURATION_HOURS;
    
    if (args.actualDurationMinutes) {
      durationHours = args.actualDurationMinutes / 60;
    } else if (match.startTime && match.finishedAt) {
      const durationMs = Number(match.finishedAt) - Number(match.startTime);
      durationHours = durationMs / (1000 * 60 * 60);
    }

    // Calculate cost
    const cost = durationHours * DATHOST_HOURLY_RATE;

    // Record cost
    await ctx.db.patch(args.matchId, {
      serverCost: cost,
      duration: durationHours * 60, // Store in minutes
    });

    console.log(`💸 Server cost recorded: $${cost.toFixed(2)} for match ${args.matchId} (${(durationHours * 60).toFixed(1)} minutes)`);

    return { cost, durationHours };
  },
});

/**
 * Estimate server cost for active match
 */
export const estimateActiveCost = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || !match.startTime) return null;

    const now = Date.now();
    const durationMs = now - Number(match.startTime);
    const durationHours = durationMs / (1000 * 60 * 60);
    const estimatedCost = durationHours * DATHOST_HOURLY_RATE;

    return {
      estimatedCost,
      durationHours,
      durationMinutes: durationHours * 60,
    };
  },
});
