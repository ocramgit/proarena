import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const checkServerStatus = internalAction({
  args: {
    dathostMatchId: v.string(),
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("DatHost credentials not configured");
      return { error: "No credentials" };
    }

    const auth = btoa(`${username}:${password}`);

    try {
      console.log("🔍 Checking DatHost CS2 match status:", args.dathostMatchId);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/cs2-matches/${args.dathostMatchId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to get match status:", response.statusText);
        return { error: response.statusText };
      }

      const matchData = await response.json();
      
      console.log("📊 CS2 Match FULL DATA:", JSON.stringify(matchData, null, 2));
      
      // Count connected players from players array
      let playersOnline = 0;
      if (matchData.players && Array.isArray(matchData.players)) {
        playersOnline = matchData.players.filter((p: any) => p.connected === true).length;
        console.log(`👥 Players connected: ${playersOnline}/${matchData.players.length}`);
        console.log(`📊 Players:`, matchData.players.map((p: any) => ({
          steam_id_64: p.steam_id_64,
          team: p.team,
          connected: p.connected
        })));
      }
      
      // Check for all_players_connected event
      const allPlayersConnectedEvent = matchData.events?.find((e: any) => e.event === "all_players_connected");
      if (allPlayersConnectedEvent) {
        console.log("✅ ALL_PLAYERS_CONNECTED event detected at:", allPlayersConnectedEvent.timestamp);
      }
      
      console.log(`👥 Final connected player count: ${playersOnline}`);
      
      // Update match with player count
      await ctx.runMutation(internal.dathostStatus.updatePlayerCount, {
        matchId: args.matchId,
        playersOnline,
      });
      
      return {
        success: true,
        playersOnline,
        allPlayersConnected: !!allPlayersConnectedEvent,
      };
    } catch (error: any) {
      console.error("Error checking server status:", error.message);
      return { error: error.message };
    }
  },
});

export const updatePlayerCount = internalMutation({
  args: {
    matchId: v.id("matches"),
    playersOnline: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);

    if (!match) return;

    const expectedPlayers = match.mode === "1v1" ? 2 : 10;
    
    console.log(`🎮 Match ${args.matchId}: ${args.playersOnline}/${expectedPlayers} players in server`);

    // CRITICAL FALLBACK: If all expected players are online, mark them as connected AND assign teams
    if (args.playersOnline >= expectedPlayers) {
      console.log("✅ [CRITICAL FALLBACK] All players detected in server via DatHost API!");
      
      // Get all player stats
      const stats = await ctx.db
        .query("player_stats")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect();

      console.log(`📊 [CRITICAL FALLBACK] Found ${stats.length} player stats, ${args.playersOnline} players online`);

      // Mark all as connected
      for (const stat of stats) {
        if (!stat.connected) {
          console.log(`✅ [CRITICAL FALLBACK] Marking player ${stat.userId} as connected`);
          await ctx.db.patch(stat._id, {
            connected: true,
          });
        }
      }

      // CRITICAL: Assign teams via RCON for ALL players
      if (match.dathostServerId) {
        console.log("🎯 [CRITICAL FALLBACK] Assigning teams via RCON...");
        
        // Get user details for team assignment
        const teamAPlayers = await Promise.all(
          match.teamA.map(async (userId) => {
            const user = await ctx.db.get(userId);
            return user;
          })
        );
        
        const teamBPlayers = await Promise.all(
          match.teamB.map(async (userId) => {
            const user = await ctx.db.get(userId);
            return user;
          })
        );

        // Assign Team A to CT
        for (const player of teamAPlayers) {
          if (player && player.steamId) {
            console.log(`📤 [CRITICAL FALLBACK] Assigning ${player.steamName || player.clerkId} to CT (Team A)`);
            await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.assignPlayerTeam, {
              dathostServerId: match.dathostServerId,
              steamId: player.steamId,
              team: 3, // CT
              playerName: player.steamName || player.clerkId.substring(0, 10),
            });
          }
        }

        // Assign Team B to T
        for (const player of teamBPlayers) {
          if (player && player.steamId) {
            console.log(`📤 [CRITICAL FALLBACK] Assigning ${player.steamName || player.clerkId} to T (Team B)`);
            await ctx.scheduler.runAfter(0, internal.cs2LogHandlers.assignPlayerTeam, {
              dathostServerId: match.dathostServerId,
              steamId: player.steamId,
              team: 2, // T
              playerName: player.steamName || player.clerkId.substring(0, 10),
            });
          }
        }
      }

      // Check if lobby is ready to start
      if (match.state === "WARMUP") {
        console.log("🎯 [CRITICAL FALLBACK] All players detected - checking lobby ready");
        await ctx.scheduler.runAfter(0, internal.lobbyReady.checkLobbyReady, {
          matchId: args.matchId,
        });
      }
    }
  },
});
