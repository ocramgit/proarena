import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

export const provisionDatHostServer = action({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; serverIp: string; dathostMatchId: string }> => {
    const match = await ctx.runQuery(api.matches.getMatchById, {
      matchId: args.matchId,
    });

    if (!match) {
      throw new Error("Match not found");
    }

    if (match.state !== "CONFIGURING") {
      throw new Error("Match is not in CONFIGURING state");
    }

    if (!match.selectedMap) {
      throw new Error("No map selected");
    }

    // Get Steam IDs for all players
    const teamA_steamIds = match.teamAPlayers.map((p: any) => p.steamId);
    const teamB_steamIds = match.teamBPlayers.map((p: any) => p.steamId);

    console.log("Creating DatHost match...");
    console.log("Map:", match.selectedMap);
    console.log("Team A Steam IDs:", teamA_steamIds);
    console.log("Team B Steam IDs:", teamB_steamIds);

    // Determine best server location
    // For 1v1: Use location with better average ping between 2 players
    // For 5v5: Use location with better average ping for all players
    // Available DatHost locations (API IDs):
    // prague, copenhagen, helsinki, strasbourg, dusseldorf, dublin, milan,
    // amsterdam, oslo, warsaw, bucharest, barcelona, stockholm, bristol
    // For now, we'll use a simple heuristic based on player count
    // TODO: Implement actual ping-based selection when we have player location data
    const totalPlayers = teamA_steamIds.length + teamB_steamIds.length;
    let serverLocation = "stockholm"; // Default
    
    if (totalPlayers === 2) {
      // For 1v1, prefer central Europe (Dusseldorf/Frankfurt has best connectivity)
      serverLocation = "dusseldorf";
    } else {
      // For 5v5, use Stockholm (good overall European coverage)
      serverLocation = "stockholm";
    }
    
    console.log("Selected server location:", serverLocation);

    try {
      const dathostMatch = await ctx.runAction(api.dathost.createDatHostMatch, {
        matchId: args.matchId,
        map: match.selectedMap,
        teamA_steamIds,
        teamB_steamIds,
        location: serverLocation,
      });

      console.log("DatHost match created:", dathostMatch);
      
      await ctx.runMutation(internal.lobbyDatHost.updateMatchWithDatHost, {
        matchId: args.matchId,
        dathostMatchId: dathostMatch.id,
        dathostServerId: dathostMatch.serverId,
        serverIp: dathostMatch.connect_string,
      });
      
      // Immediately check CS2 match status after creation
      console.log("🚀 Server created, checking initial CS2 match status...");
      await ctx.runAction(internal.dathostStatus.checkServerStatus, {
        dathostMatchId: dathostMatch.id,
        matchId: args.matchId,
      });
      
      // Schedule warmup check (5 minutes)
      await ctx.runMutation(internal.matchWarmup.scheduleWarmupCheck, {
        matchId: args.matchId,
      });

      return {
        success: true,
        serverIp: dathostMatch.connect_string,
        dathostMatchId: dathostMatch.id,
      };
    } catch (error: any) {
      console.error("Failed to create DatHost match:", error);
      throw new Error(`Failed to provision server: ${error.message}`);
    }
  },
});

export const updateMatchWithDatHost = internalMutation({
  args: {
    matchId: v.id("matches"),
    dathostMatchId: v.string(),
    dathostServerId: v.string(),
    serverIp: v.string(),
  },
  handler: async (ctx, args) => {
    // Store server info but don't change state yet (warmup will handle state transition)
    await ctx.db.patch(args.matchId, {
      dathostMatchId: args.dathostMatchId,
      dathostServerId: args.dathostServerId,
      serverIp: args.serverIp,
    });

    return { success: true };
  },
});
