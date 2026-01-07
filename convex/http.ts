/**
 * FASE 60: HTTP ENDPOINTS - LOG PARSING
 * 
 * Real-time CS2 log parsing for:
 * - Player connections (whitelist enforcement)
 * - Team assignments
 * - Match events (kills, rounds, game end)
 */

import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * CS2 Log Parser - Receives real-time logs from game server
 */
http.route({
  path: "/cs2-logs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      const lines = body.split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        // Player Connected
        const connectMatch = line.match(/"(.+?)<(\d+)><(\[U:1:\d+\]|STEAM_\d+:\d+:\d+)>"/);
        if (connectMatch && (line.includes("connected") || line.includes("entered the game"))) {
          const [, playerName, , steamId] = connectMatch;

          console.log("✅ [LOG] Player connected:", playerName, steamId);

          await ctx.runMutation(internal.logHandlers.handlePlayerConnect, {
            steamId,
            playerName,
          });
          continue;
        }

        // Player Joined Team
        const teamMatch = line.match(/"(.+?)<(\d+)><(\[U:1:\d+\]|STEAM_\d+:\d+:\d+)>" switched from team <(.+?)> to <(CT|TERRORIST)>/);
        if (teamMatch) {
          const [, playerName, , steamId, , team] = teamMatch;

          console.log("🔄 [LOG] Player joined team:", playerName, team);

          await ctx.runMutation(internal.logHandlers.handleTeamJoin, {
            steamId,
            team,
          });
          continue;
        }

        // Player Kill
        const killMatch = line.match(/"(.+?)<(\d+)><(\[U:1:\d+\]|STEAM_\d+:\d+:\d+)><(.+?)>" killed "(.+?)<(\d+)><(\[U:1:\d+\]|STEAM_\d+:\d+:\d+)><(.+?)>" with "(.+?)"/);
        if (killMatch) {
          const [, , , killerSteamId, , , , victimSteamId, , weapon] = killMatch;

          await ctx.runMutation(internal.logHandlers.handlePlayerKill, {
            killerSteamId,
            victimSteamId,
            weapon,
          });
          continue;
        }

        // Round End
        const roundEndMatch = line.match(/Team "(CT|TERRORIST)" scored "(\d+)" with "(\d+)" players/);
        if (roundEndMatch) {
          const [, winningTeam, score] = roundEndMatch;

          console.log("🏁 [LOG] Round end:", winningTeam, "scored", score);

          await ctx.runMutation(internal.logHandlers.handleRoundEnd, {
            winningTeam,
            score: parseInt(score),
          });
          continue;
        }

        // Game Over
        if (line.includes("Game Over:") || line.includes("SFUI_Notice_Match_Final_Score")) {
          console.log("🏆 [LOG] Game Over detected");

          await ctx.runMutation(internal.logHandlers.handleGameOver, {});
          continue;
        }
      }

      return new Response("OK", { status: 200 });
    } catch (error: any) {
      console.error("❌ [LOG PARSER] Error:", error.message);
      return new Response("Error", { status: 500 });
    }
  }),
});

export default http;
