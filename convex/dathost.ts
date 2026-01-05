import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { steamIdToSteamId64 } from "./steamIdUtils";

async function getDatHostAuth() {
  const username = process.env.DATHOST_USERNAME;
  const password = process.env.DATHOST_PASSWORD;

  if (!username || !password) {
    throw new Error("DatHost credentials not configured");
  }

  return btoa(`${username}:${password}`);
}

// Convert Steam IDs to Steam64 format for DatHost whitelist
function ensureSteamId64(steamId: string): string {
  if (steamId.startsWith("STEAM_0:")) {
    return steamIdToSteamId64(steamId);
  }
  return steamId;
}

interface DatHostMatchResponse {
  id: string;
  ip: string;
  port: number;
  connect_string: string;
  status: string;
  serverId: string;
}

export const createDatHostMatch = action({
  args: {
    matchId: v.id("matches"),
    map: v.string(),
    teamA_steamIds: v.array(v.string()),
    teamB_steamIds: v.array(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DatHostMatchResponse> => {
    const auth = await getDatHostAuth();

    // Convert all Steam IDs to Steam64 format for whitelist
    const teamA_steam64 = args.teamA_steamIds.map(ensureSteamId64);
    const teamB_steam64 = args.teamB_steamIds.map(ensureSteamId64);
    const allSteamIds = [...teamA_steam64, ...teamB_steam64];

    console.log("🔐 Whitelist Steam64 IDs:", allSteamIds);

    // Create a new pay-as-you-go CS2 server
    console.log("Creating new pay-as-you-go CS2 server...");
    
    let gameServerId = "";
    try {
      // Create FormData for multipart/form-data request
      // Determine slots based on team size (1v1 = 5 slots minimum, 5v5 = 12 slots)
      const totalPlayers = args.teamA_steamIds.length + args.teamB_steamIds.length;
      const slots = totalPlayers <= 2 ? "5" : "12";
      const serverLocation = args.location || "stockholm";
      
      const webhookUrl = `${process.env.CONVEX_SITE_URL}/dathost-webhook`;
      
      const formData = new URLSearchParams();
      formData.append("game", "cs2");
      formData.append("name", `ProArena Match ${Date.now()}`);
      formData.append("location", serverLocation);
      formData.append("cs2_settings.slots", slots);
      formData.append("cs2_settings.rcon", "proarena123");
      formData.append("autostop", "true");
      formData.append("autostop_minutes", "30");
      
      // Configure webhook for match events
      formData.append("csgo_settings.webhook_url", webhookUrl);
      
      // WHITELIST ENFORCEMENT: Add Steam64 IDs to whitelist
      allSteamIds.forEach((steamId, index) => {
        formData.append(`cs2_settings.steam_game_server_login_token_whitelisted_steam_ids[${index}]`, steamId);
      });
      
      console.log("🔐 Whitelist configured with", allSteamIds.length, "Steam IDs");
      console.log("🔔 Webhook URL configured:", webhookUrl);

      const createServerResponse = await fetch("https://dathost.net/api/0.1/game-servers", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!createServerResponse.ok) {
        const errorText = await createServerResponse.text();
        console.error("Server creation failed:", errorText);
        throw new Error(`Failed to create server: ${createServerResponse.status} - ${errorText}`);
      }

      const newServer = await createServerResponse.json();
      gameServerId = newServer.id;
      console.log("Created new server:", gameServerId);
      
      // Start the server
      console.log("Starting server...");
      await fetch(`https://dathost.net/api/0.1/game-servers/${gameServerId}/start`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });
      
      // Wait for server to start
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      const convexSiteUrl = process.env.CONVEX_SITE_URL || process.env.CONVEX_CLOUD_URL;
      
      // PHASE 11 SPECIAL: Configure 1v1 settings
      console.log("⚙️ Configuring 1v1 server settings...");
      
      // AUTO-ASSIGN TEAMS: Team A = CT, Team B = T
      const teamAssignCommands = [];
      
      // Assign Team A players to CT (team 3)
      for (const steamId of teamA_steam64) {
        teamAssignCommands.push(`sm_team "#${steamId}" 3`); // 3 = CT
      }
      
      // Assign Team B players to T (team 2)
      for (const steamId of teamB_steam64) {
        teamAssignCommands.push(`sm_team "#${steamId}" 2`); // 2 = T
      }
      
      const commands = [
        "mp_warmuptime 9999", // Infinite warmup until all players connect
        "mp_maxrounds 30", // MR15 = 30 rounds max
        "mp_freezetime 3", // Short freeze time for 1v1
        "mp_halftime 1", // Enable halftime
        "mp_overtime_enable 1", // Enable overtime
        "mp_overtime_maxrounds 6", // MR3 overtime
        "sv_alltalk 0", // No all-talk
        "mp_match_restart_delay 5", // Quick restart
        "mp_autoteambalance 0", // Disable auto team balance
        "mp_limitteams 0", // No team limits
        ...teamAssignCommands, // Auto-assign teams
      ];
      
      for (const command of commands) {
        await fetch(`https://dathost.net/api/0.1/game-servers/${gameServerId}/console`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ line: command }),
        });
      }
      
      console.log("✅ 1v1 server configured");
      
      // Configure log addresses for CS2 events
      if (convexSiteUrl) {
        console.log("🎯 Configuring CS2 log endpoints...");
        
        // Main CS2 logs endpoint (kills, rounds, etc)
        await fetch(`https://dathost.net/api/0.1/game-servers/${gameServerId}/console`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            line: `logaddress_add_http "${convexSiteUrl}/cs2-logs"`,
          }),
        });
        
        // Game end notification endpoint
        await fetch(`https://dathost.net/api/0.1/game-servers/${gameServerId}/console`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            line: `logaddress_add_http "${convexSiteUrl}/game-end-notify"`,
          }),
        });
        
        console.log("✅ CS2 log endpoints configured");
      }
      
      console.log("✅ Server configured with infinite warmup - awaiting all players");
    } catch (error: any) {
      throw new Error(`Failed to create game server: ${error.message}`);
    }

    const body = {
      game_server_id: gameServerId,
      players: [
        ...teamA_steam64.map((steamId) => ({
          steam_id_64: steamId,
          team: "team1",
        })),
        ...teamB_steam64.map((steamId) => ({
          steam_id_64: steamId,
          team: "team2",
        })),
      ],
      team1: {
        name: "Team A",
      },
      team2: {
        name: "Team B",
      },
      settings: {
        map: args.map,
        connect_time: 300,
        match_begin_countdown: 30,
        enable_plugin: true,
        enable_tech_pause: true,
        // Note: mr, overtime_mr, knife_round are set via RCON commands instead
      },
    };

    try {
      const response = await fetch("https://dathost.net/api/0.1/cs2-matches", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `DatHost API error: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      console.log("DatHost match created:", data);

      // Get server info to get the IP
      const serverResponse = await fetch(
        `https://dathost.net/api/0.1/game-servers/${gameServerId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      let serverIp = "pending";
      let serverPort = 27015;
      
      if (serverResponse.ok) {
        const serverData = await serverResponse.json();
        serverIp = serverData.ip || serverData.raw_ip || "pending";
        serverPort = serverData.ports?.game || 27015;
        console.log("Server details:", { ip: serverIp, port: serverPort });
      }

      return {
        id: data.id,
        ip: serverIp,
        port: serverPort,
        connect_string: `${serverIp}:${serverPort}`,
        status: data.status || "pending",
        serverId: gameServerId,
      };
    } catch (error: any) {
      console.error("DatHost API Error:", error);
      throw new Error(`Failed to create DatHost match: ${error.message}`);
    }
  },
});

export const getDatHostMatchStatus = action({
  args: {
    matchId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await getDatHostAuth();

    try {
      const response = await fetch(
        `https://dathost.net/api/0.1/cs2-matches/${args.matchId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`DatHost API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error("DatHost API Error:", error);
      throw new Error(`Failed to get DatHost match status: ${error.message}`);
    }
  },
});
