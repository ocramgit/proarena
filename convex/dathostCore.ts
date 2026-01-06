import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * MEGA ATUALIZAÇÃO: CORE 2.0 - DATHOST REESCRITO DO ZERO
 * Usa APENAS o endpoint cs2-matches (NÃO game-servers)
 * Whitelist e team assignment são geridos nativamente pela DatHost
 */

function getDatHostAuth(): string {
  const username = process.env.DATHOST_USERNAME;
  const password = process.env.DATHOST_PASSWORD;

  if (!username || !password) {
    throw new Error("DatHost credentials not configured");
  }

  return btoa(`${username}:${password}`);
}

// Convert STEAM_0:X:Y to SteamID64
function steamIdToSteamId64(steamId: string): string {
  if (!steamId.startsWith("STEAM_0:")) {
    return steamId; // Already SteamID64
  }

  const parts = steamId.split(":");
  const Y = parseInt(parts[2]);
  const Z = parseInt(parts[1]);
  const steamId64 = BigInt(76561197960265728) + BigInt(Y * 2) + BigInt(Z);
  
  return steamId64.toString();
}

interface MatchServerResponse {
  id: string;
  server_ip: string;
  server_port: number;
  connect_string: string;
  status: string;
}

/**
 * CORE 2.0: CREATE MATCH SERVER
 * Endpoint: POST /cs2-matches (NÃO /game-servers)
 * Vantagens:
 * - Whitelist automática (team1_steam_ids + team2_steam_ids)
 * - Team assignment nativo (Team1 = CT, Team2 = T)
 * - Webhooks nativos (match_finished, round_start)
 * - Gestão de ciclo de vida simplificada
 */
export const spawnServer = action({
  args: {
    matchId: v.id("matches"),
    map: v.string(),
    location: v.string(),
    ctSteamId: v.string(), // Player que começa CT (Team 1)
    tSteamId: v.string(),  // Player que começa T (Team 2)
  },
  handler: async (ctx, args): Promise<MatchServerResponse> => {
    const auth = getDatHostAuth();
    
    // Convert to SteamID64 format
    const ctSteamId64 = steamIdToSteamId64(args.ctSteamId);
    const tSteamId64 = steamIdToSteamId64(args.tSteamId);
    
    console.log("🎮 [CORE 2.0] Creating CS2 Match Server");
    console.log("📍 Location:", args.location);
    console.log("🗺️ Map:", args.map);
    console.log("🛡️ CT (Team 1):", ctSteamId64);
    console.log("🎯 T (Team 2):", tSteamId64);

    const convexSiteUrl = process.env.CONVEX_SITE_URL || process.env.CONVEX_CLOUD_URL;
    
    // CORE 2.0: Payload para cs2-matches endpoint
    const payload = {
      game: "cs2",
      name: `ProArena 1v1 [${args.matchId}]`,
      location: args.location,
      slots: 5, // Mínimo para faturação hourly (regra DatHost)
      map: args.map,
      team1_steam_ids: [ctSteamId64], // DatHost coloca Team1 a CT automaticamente
      team2_steam_ids: [tSteamId64],  // DatHost coloca Team2 a T automaticamente
      match_group_id: "PROARENA_1v1",
      connect_time: 300, // 5 minutos para conectar
      enable_pause: true,
      enable_gotv: false, // Demos são guardados no servidor
      webhook_url: convexSiteUrl ? `${convexSiteUrl}/dathost-webhook` : undefined,
      settings: {
        mp_maxrounds: 24,           // MR12 (primeiro a 13)
        mp_overtime_enable: 1,       // Overtime ativado
        mp_overtime_maxrounds: 6,    // MR3 overtime
        mp_freezetime: 5,            // 5 segundos de freeze
        mp_halftime: 1,              // Halftime ativado
        mp_warmuptime: 60,           // 60 segundos de warmup
        mp_warmup_pausetimer: 1,     // Warmup pausa quando jogadores conectam
        bot_quota: 0,                // Sem bots
        mp_autoteambalance: 0,       // Sem auto-balance
        mp_limitteams: 0,            // Sem limite de equipas
        sv_cheats: 0,                // Anti-cheat ativo
        sv_pure: 1,                  // Pure server (sem custom files)
      },
    };

    try {
      console.log("📤 Sending request to DatHost cs2-matches endpoint...");
      
      const response = await fetch("https://dathost.net/api/0.1/cs2-matches", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ DatHost API error:", response.status, errorText);
        throw new Error(`Failed to create match server: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("✅ Match server created:", data);

      // Extract server details
      const matchId = data.id;
      const serverIp = data.server_ip || data.ip || "pending";
      const serverPort = data.server_port || data.port || 27015;

      return {
        id: matchId,
        server_ip: serverIp,
        server_port: serverPort,
        connect_string: `connect ${serverIp}:${serverPort}`,
        status: data.status || "pending",
      };
    } catch (error: any) {
      console.error("❌ Error creating match server:", error);
      throw new Error(`Failed to create match server: ${error.message}`);
    }
  },
});

/**
 * CORE 2.0: TERMINATE MATCH SERVER
 * Deleta o servidor após o jogo terminar
 * Endpoint: DELETE /cs2-matches/{id}
 */
export const terminateServer = internalAction({
  args: {
    dathostMatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = getDatHostAuth();

    try {
      console.log("🗑️ [CORE 2.0] Terminating match server:", args.dathostMatchId);
      
      const response = await fetch(
        `https://dathost.net/api/0.1/cs2-matches/${args.dathostMatchId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        console.error("❌ Failed to terminate server:", response.status);
        return { success: false, error: response.statusText };
      }

      console.log("✅ Match server terminated successfully");
      return { success: true };
    } catch (error: any) {
      console.error("❌ Error terminating server:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * CORE 2.0: GET MATCH STATUS (Fast-Track Sync)
 * Obtém o Status Object JSON com statsA/statsB
 * Usado para sincronização instantânea
 */
export const getMatchStatus = internalAction({
  args: {
    dathostMatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = getDatHostAuth();

    try {
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
        console.error("❌ Failed to get match status:", response.status);
        return null;
      }

      const data = await response.json();
      
      // Log status object for debugging
      console.log("📊 [CORE 2.0] Match Status Object:", JSON.stringify(data, null, 2));
      
      return data;
    } catch (error: any) {
      console.error("❌ Error getting match status:", error);
      return null;
    }
  },
});

/**
 * CORE 2.0: DOWNLOAD DEMO
 * Obtém URL do demo após o jogo terminar
 */
export const getDemoUrl = internalAction({
  args: {
    dathostMatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = getDatHostAuth();

    try {
      const response = await fetch(
        `https://dathost.net/api/0.1/cs2-matches/${args.dathostMatchId}/demos`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        console.error("❌ Failed to get demo URL:", response.status);
        return null;
      }

      const demos = await response.json();
      
      if (demos && demos.length > 0) {
        // Return the most recent demo
        const latestDemo = demos[demos.length - 1];
        console.log("📹 Demo available:", latestDemo.url);
        return latestDemo.url;
      }

      return null;
    } catch (error: any) {
      console.error("❌ Error getting demo URL:", error);
      return null;
    }
  },
});
