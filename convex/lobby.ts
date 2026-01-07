import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { internal } from "./_generated/api";

export const banMap = mutation({
  args: {
    matchId: v.id("matches"),
    mapName: v.string(),
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

    if (match.bannedMaps.includes(args.mapName)) {
      throw new Error("Map already banned");
    }

    if (!match.mapPool.includes(args.mapName)) {
      throw new Error("Map not in pool");
    }

    const bannedCount = match.bannedMaps.length;
    const isTeamATurn = bannedCount % 2 === 0;

    if ((isTeamATurn && !isInTeamA) || (!isTeamATurn && !isInTeamB)) {
      throw new Error("Not your team's turn to ban");
    }

    const newBannedMaps = [...match.bannedMaps, args.mapName];
    const remainingMaps = match.mapPool.filter(
      (map) => !newBannedMaps.includes(map)
    );

    if (remainingMaps.length === 1) {
      // MEGA ATUALIZAÇÃO: COIN FLIP - Randomize CT/T sides
      const coinFlip = Math.random() < 0.5;
      const playerA = match.teamA[0]; // First player in Team A
      const playerB = match.teamB[0]; // First player in Team B
      
      const teamCtId = coinFlip ? playerA : playerB;
      const teamTId = coinFlip ? playerB : playerA;
      
      console.log("🎲 COIN FLIP: CT side goes to", coinFlip ? "Team A" : "Team B");
      console.log("🛡️ CT Player ID:", teamCtId);
      console.log("🎯 T Player ID:", teamTId);
      
      await ctx.db.patch(args.matchId, {
        bannedMaps: newBannedMaps,
        selectedMap: remainingMaps[0],
        startingSideCt: teamCtId,
        startingSideT: teamTId,
        teamCtId,
        teamTId,
        state: "CONFIGURING",
      });

      console.log("🚀 Final map selected:", remainingMaps[0]);

      // FASE 60: Trigger server creation
      await ctx.scheduler.runAfter(0, internal.lobbyOrchestrator.onMapSelected, {
        matchId: args.matchId,
      });

      return {
        success: true,
        bannedMap: args.mapName,
        selectedMap: remainingMaps[0],
        newState: "CONFIGURING",
        autoProvision: true,
      };
    }

    await ctx.db.patch(args.matchId, {
      bannedMaps: newBannedMaps,
    });

    return {
      success: true,
      bannedMap: args.mapName,
      remainingMaps: remainingMaps.length,
      nextTurn: isTeamATurn ? "Team B" : "Team A",
    };
  },
});

export const getVetoStatus = query({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      return null;
    }

    const identity = await ctx.auth.getUserIdentity();
    let currentUserTeam: "A" | "B" | null = null;

    if (identity) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
        .first();

      if (user) {
        if (match.teamA.includes(user._id)) {
          currentUserTeam = "A";
        } else if (match.teamB.includes(user._id)) {
          currentUserTeam = "B";
        }
      }
    }

    const bannedCount = match.bannedMaps.length;
    const isTeamATurn = bannedCount % 2 === 0;
    const remainingMaps = match.mapPool.filter(
      (map) => !match.bannedMaps.includes(map)
    );

    return {
      state: match.state,
      bannedMaps: match.bannedMaps,
      remainingMaps,
      currentTurn: isTeamATurn ? "A" : "B",
      isYourTurn:
        currentUserTeam &&
        ((isTeamATurn && currentUserTeam === "A") ||
          (!isTeamATurn && currentUserTeam === "B")),
      selectedMap: remainingMaps.length === 1 ? remainingMaps[0] : null,
    };
  },
});
