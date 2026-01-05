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

    // PHASE 12: Use selected location from veto
    // Map location names to DatHost API location IDs
    const locationMap: Record<string, string> = {
      "Frankfurt": "dusseldorf", // Closest to Frankfurt
      "Paris": "strasbourg", // Closest to Paris
      "Madrid": "barcelona", // Closest to Madrid
    };
    
    const serverLocation = match.selectedLocation 
      ? locationMap[match.selectedLocation] || "dusseldorf"
      : "dusseldorf"; // Default fallback
    
    console.log("Selected location:", match.selectedLocation, "-> DatHost location:", serverLocation);
    
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

      // Auto-connect bots in 1v1 mode
      await ctx.runMutation(internal.lobbyDatHost.autoConnectBots, {
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

// Auto-connect bots in 1v1 mode
export const autoConnectBots = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.mode !== "1v1") return;

    console.log("🤖 Auto-connecting bots for 1v1 match");

    // Get all players in the match
    const allPlayers = [...match.teamA, ...match.teamB];

    for (const playerId of allPlayers) {
      const user = await ctx.db.get(playerId);
      if (!user) continue;

      // Check if this is a bot
      const isBot = user.clerkId.startsWith("fake_");
      if (!isBot) continue;

      console.log("🤖 Auto-connecting bot:", user.clerkId);

      // Check if player_stats exists
      const existingStat = await ctx.db
        .query("player_stats")
        .withIndex("by_user_match", (q) => 
          q.eq("userId", playerId).eq("matchId", args.matchId)
        )
        .first();

      if (existingStat) {
        await ctx.db.patch(existingStat._id, { connected: true });
      } else {
        await ctx.db.insert("player_stats", {
          matchId: args.matchId,
          userId: playerId,
          kills: 0,
          deaths: 0,
          assists: 0,
          mvps: 0,
          connected: true,
        });
      }

      console.log("✅ Bot marked as connected");
    }
  },
});
