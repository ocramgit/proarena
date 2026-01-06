import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

export const provisionDatHostServer = action({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args): Promise<{ success: boolean; serverIp: string; dathostMatchId: string }> => {
    console.log(`🔵 [PROVISION START] Match ${args.matchId} - Checking conditions...`);
    
    const match = await ctx.runQuery(api.matches.getMatchById, {
      matchId: args.matchId,
    });

    if (!match) {
      console.error(`❌ [PROVISION FAIL] Match ${args.matchId} not found`);
      throw new Error("Match not found");
    }

    console.log(`🔍 [PROVISION CHECK] Match state: ${match.state}, serverIp: ${match.serverIp}, provisioningStarted: ${match.provisioningStarted}`);

    if (match.state !== "CONFIGURING") {
      console.warn(`⚠️ [PROVISION SKIP] Match ${args.matchId} not in CONFIGURING state (current: ${match.state})`);
      throw new Error("Match is not in CONFIGURING state");
    }

    if (!match.selectedMap) {
      console.error(`❌ [PROVISION FAIL] Match ${args.matchId} has no map selected`);
      throw new Error("No map selected");
    }

    // RACE CONDITION LOCK: Prevent duplicate server creation
    if (match.serverIp || match.provisioningStarted) {
      console.warn(`🚫 [PROVISION BLOCKED] Match ${args.matchId} - Server already provisioning or provisioned! serverIp: ${match.serverIp}, provisioningStarted: ${match.provisioningStarted}`);
      throw new Error("Server already being provisioned");
    }

    console.log(`🔒 [PROVISION LOCK] Setting lock for match ${args.matchId}...`);
    
    // Immediately set lock flag
    await ctx.runMutation(internal.lobbyDatHost.setProvisioningLock, {
      matchId: args.matchId,
    });

    console.log(`✅ [PROVISION LOCK] Lock set for match ${args.matchId}`);

    // Get Steam IDs for all players
    const teamA_steamIds = match.teamAPlayers.map((p: any) => p.steamId);
    const teamB_steamIds = match.teamBPlayers.map((p: any) => p.steamId);

    console.log(`🎮 [PROVISION CREATE] Creating DatHost server for match ${args.matchId}...`);
    console.log(`📍 Map: ${match.selectedMap}`);
    console.log(`👥 Team A Steam IDs:`, teamA_steamIds);
    console.log(`👥 Team B Steam IDs:`, teamB_steamIds);

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

    // FASE 22: Get CT/T assignments from coin flip
    if (!match.startingSideCt || !match.startingSideT) {
      throw new Error("CT/T sides not assigned - coin flip missing");
    }

    const ctPlayer = match.teamAPlayers.find((p: any) => p._id === match.startingSideCt) || 
                     match.teamBPlayers.find((p: any) => p._id === match.startingSideCt);
    const tPlayer = match.teamAPlayers.find((p: any) => p._id === match.startingSideT) || 
                    match.teamBPlayers.find((p: any) => p._id === match.startingSideT);

    if (!ctPlayer || !tPlayer) {
      throw new Error("Could not find CT/T players");
    }

    console.log("🛡️ CT Player:", ctPlayer.steamId);
    console.log("🎯 T Player:", tPlayer.steamId);

    try {
      // MEGA ATUALIZAÇÃO: Use CORE 2.0 cs2-matches endpoint
      const dathostMatch = await ctx.runAction(api.dathostCore.spawnServer, {
        matchId: args.matchId,
        map: match.selectedMap,
        location: serverLocation,
        ctSteamId: ctPlayer.steamId,
        tSteamId: tPlayer.steamId,
      });

      console.log("DatHost match created:", dathostMatch);
      
      await ctx.runMutation(internal.lobbyDatHost.updateMatchWithDatHost, {
        matchId: args.matchId,
        dathostMatchId: dathostMatch.id,
        dathostServerId: dathostMatch.id, // FASE 22: cs2-matches uses same ID
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

export const setProvisioningLock = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    
    // Double-check: if already locked, throw error
    if (match?.provisioningStarted || match?.serverIp) {
      console.error(`🚫 [LOCK FAIL] Match ${args.matchId} already locked!`);
      throw new Error("Match already locked");
    }
    
    await ctx.db.patch(args.matchId, {
      provisioningStarted: true,
    });
    
    console.log(`🔐 [LOCK SUCCESS] Match ${args.matchId} locked`);
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
      provisioningStarted: true,
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
