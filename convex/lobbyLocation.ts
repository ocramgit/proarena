import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const banLocation = mutation({
  args: {
    matchId: v.id("matches"),
    location: v.string(),
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

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.state !== "VETO") {
      throw new Error("Match is not in VETO state");
    }

    const isInTeamA = match.teamA.includes(user._id);
    const isInTeamB = match.teamB.includes(user._id);

    if (!isInTeamA && !isInTeamB) {
      throw new Error("You are not in this match");
    }

    const locationPool = match.locationPool || ["Frankfurt", "Paris", "Madrid"];
    const bannedLocations = match.bannedLocations || [];

    if (bannedLocations.includes(args.location)) {
      throw new Error("Location already banned");
    }

    if (!locationPool.includes(args.location)) {
      throw new Error("Location not in pool");
    }

    const bannedCount = bannedLocations.length;
    const isTeamATurn = bannedCount % 2 === 0;

    if ((isTeamATurn && !isInTeamA) || (!isTeamATurn && !isInTeamB)) {
      throw new Error("Not your turn to ban");
    }

    const newBannedLocations = [...bannedLocations, args.location];
    const remainingLocations = locationPool.filter(
      (loc) => !newBannedLocations.includes(loc)
    );

    // Auto-select if only one location remains
    if (remainingLocations.length === 1) {
      await ctx.db.patch(args.matchId, {
        bannedLocations: newBannedLocations,
        selectedLocation: remainingLocations[0],
      });
      console.log(`✅ Location auto-selected: ${remainingLocations[0]}`);
    } else {
      await ctx.db.patch(args.matchId, {
        bannedLocations: newBannedLocations,
      });
    }

    return {
      success: true,
      bannedLocations: newBannedLocations,
      selectedLocation: remainingLocations.length === 1 ? remainingLocations[0] : null,
    };
  },
});
