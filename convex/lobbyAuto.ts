import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const autoBanLocationForBots = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.state !== "VETO") {
      return { success: false, message: "Match is not in VETO state" };
    }

    const locationPool = match.locationPool || ["Frankfurt", "Paris", "Madrid"];
    const bannedLocations = match.bannedLocations || [];
    
    // Check if location is already selected
    if (match.selectedLocation) {
      return { success: false, message: "Location already selected" };
    }

    const bannedCount = bannedLocations.length;
    const isTeamATurn = bannedCount % 2 === 0;
    const currentTeam = isTeamATurn ? match.teamA : match.teamB;

    // Check if current team has any real players
    const teamUsers = await Promise.all(
      currentTeam.map((userId) => ctx.db.get(userId))
    );

    const hasRealPlayer = teamUsers.some(
      (user) => user && !user.clerkId.startsWith("fake_")
    );

    // If team has real players, don't auto-ban
    if (hasRealPlayer) {
      return { success: false, message: "Team has real players" };
    }

    // Auto-ban: pick a random available location
    const availableLocations = locationPool.filter(
      (loc) => !bannedLocations.includes(loc)
    );

    if (availableLocations.length === 0) {
      return { success: false, message: "No locations available" };
    }

    const randomLocation =
      availableLocations[Math.floor(Math.random() * availableLocations.length)];

    const newBannedLocations = [...bannedLocations, randomLocation];
    const remainingLocations = locationPool.filter(
      (loc) => !newBannedLocations.includes(loc)
    );

    // Auto-select if only one location remains
    if (remainingLocations.length === 1) {
      await ctx.db.patch(args.matchId, {
        bannedLocations: newBannedLocations,
        selectedLocation: remainingLocations[0],
      });
      console.log(`🤖 Bot auto-selected location: ${remainingLocations[0]}`);
      return {
        success: true,
        bannedLocation: randomLocation,
        selectedLocation: remainingLocations[0],
      };
    }

    await ctx.db.patch(args.matchId, {
      bannedLocations: newBannedLocations,
    });

    console.log(`🤖 Bot auto-banned location: ${randomLocation}`);
    return {
      success: true,
      bannedLocation: randomLocation,
    };
  },
});

export const autoBanForBots = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Match not found");
    }

    if (match.state !== "VETO") {
      return { success: false, message: "Match is not in VETO state" };
    }

    const bannedCount = match.bannedMaps.length;
    const isTeamATurn = bannedCount % 2 === 0;
    const currentTeam = isTeamATurn ? match.teamA : match.teamB;

    // Check if current team has any real players
    const teamUsers = await Promise.all(
      currentTeam.map((userId) => ctx.db.get(userId))
    );

    const hasRealPlayer = teamUsers.some(
      (user) => user && !user.clerkId.startsWith("fake_")
    );

    // If team has real players, don't auto-ban
    if (hasRealPlayer) {
      return { success: false, message: "Team has real players" };
    }

    // Auto-ban: pick a random available map
    const availableMaps = match.mapPool.filter(
      (map) => !match.bannedMaps.includes(map)
    );

    if (availableMaps.length === 0) {
      return { success: false, message: "No maps available" };
    }

    const randomMap =
      availableMaps[Math.floor(Math.random() * availableMaps.length)];

    const newBannedMaps = [...match.bannedMaps, randomMap];
    const remainingMaps = match.mapPool.filter(
      (map) => !newBannedMaps.includes(map)
    );

    if (remainingMaps.length === 1) {
      await ctx.db.patch(args.matchId, {
        bannedMaps: newBannedMaps,
        selectedMap: remainingMaps[0],
        state: "CONFIGURING",
      });

      console.log("🤖 Bot auto-selected final map:", remainingMaps[0]);

      return {
        success: true,
        bannedMap: randomMap,
        selectedMap: remainingMaps[0],
        newState: "CONFIGURING",
      };
    }

    await ctx.db.patch(args.matchId, {
      bannedMaps: newBannedMaps,
    });

    return {
      success: true,
      bannedMap: randomMap,
      remainingMaps: remainingMaps.length,
      nextTurn: isTeamATurn ? "Team B" : "Team A",
    };
  },
});
