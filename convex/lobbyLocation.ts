/**
 * FASE 60: LOBBY LOCATION - Veto de Localização
 * 
 * Sistema de veto para escolher localização do servidor
 */

import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

function normalizeLocationId(location: string): string {
  switch (location) {
    case "Frankfurt":
      return "dusseldorf";
    case "Paris":
      return "strasbourg";
    case "Madrid":
      return "barcelona";
    default:
      return location;
  }
}

/**
 * Ban a location during veto phase
 */
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

    const requestedLocation = normalizeLocationId(args.location);
    const rawLocationPool = match.locationPool || ["dusseldorf", "strasbourg", "barcelona"];
    const rawBannedLocations = match.bannedLocations || [];
    const rawSelectedLocation = match.selectedLocation;

    const locationPool = rawLocationPool.map(normalizeLocationId);
    const bannedLocations = rawBannedLocations.map(normalizeLocationId);
    const selectedLocation = rawSelectedLocation ? normalizeLocationId(rawSelectedLocation) : undefined;

    // Auto-migrate old values stored in DB (Frankfurt/Paris/Madrid) to DatHost IDs
    if (
      JSON.stringify(rawLocationPool) !== JSON.stringify(locationPool) ||
      JSON.stringify(rawBannedLocations) !== JSON.stringify(bannedLocations) ||
      (rawSelectedLocation && rawSelectedLocation !== selectedLocation)
    ) {
      await ctx.db.patch(args.matchId, {
        locationPool,
        bannedLocations,
        selectedLocation,
      });
    }

    if (bannedLocations.includes(requestedLocation)) {
      throw new Error("Location already banned");
    }

    if (!locationPool.includes(requestedLocation)) {
      throw new Error("Location not in pool");
    }

    const bannedCount = bannedLocations.length;
    const isTeamATurn = bannedCount % 2 === 0;

    if ((isTeamATurn && !isInTeamA) || (!isTeamATurn && !isInTeamB)) {
      throw new Error("Not your team's turn to ban");
    }

    const newBannedLocations = [...bannedLocations, requestedLocation];
    const remainingLocations = locationPool.filter(
      (loc) => !newBannedLocations.includes(loc)
    );

    // If only one location remains, select it
    if (remainingLocations.length === 1) {
      await ctx.db.patch(args.matchId, {
        bannedLocations: newBannedLocations,
        selectedLocation: remainingLocations[0],
      });

      console.log("📍 Location selected:", remainingLocations[0]);

      return {
        success: true,
        bannedLocation: requestedLocation,
        selectedLocation: remainingLocations[0],
      };
    }

    await ctx.db.patch(args.matchId, {
      bannedLocations: newBannedLocations,
    });

    return {
      success: true,
      bannedLocation: requestedLocation,
      remainingLocations: remainingLocations.length,
      nextTurn: isTeamATurn ? "Team B" : "Team A",
    };
  },
});
