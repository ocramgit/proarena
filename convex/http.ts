import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// CS2 Log Parser - Receives real-time logs from game server
http.route({
  path: "/cs2-logs",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.text();
      
      console.log("📨 Received CS2 logs, length:", body.length, "at", new Date().toISOString());
      
      // Parse the log line
      const lines = body.split("\n");
      
      console.log(`📋 Processing ${lines.length} log lines...`);
      
      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Log ALL lines to see what we're receiving
        console.log("📋 CS2 Log:", line);
        
        // Log lines with Steam IDs specifically
        if (line.includes("STEAM_")) {
          console.log("🎮 STEAM ID DETECTED:", line);
        }
        
        // Log connection-related events
        if (line.includes("connected") || line.includes("entered") || line.includes("validated")) {
          console.log("🔌 CONNECTION EVENT:", line);
        }
        
        // Player Connected - multiple patterns
        const connectMatch = line.match(/"(.+?)<(\d+)><(STEAM_\d+:\d+:\d+)>"/);
        if (connectMatch && (line.includes("connected") || line.includes("entered the game") || line.includes("STEAM_USERID validated"))) {
          const [, playerName, , steamId] = connectMatch;
          
          console.log("✅ Player connection detected:", playerName, steamId);
          
          await ctx.runMutation(internal.cs2LogHandlers.handlePlayerConnect, {
            steamId,
            playerName,
          });
          continue;
        }
        
        // Player Killed
        const killMatch = line.match(/"(.+?)<(\d+)><(STEAM_\d+:\d+:\d+)><(.+?)>" killed "(.+?)<(\d+)><(STEAM_\d+:\d+:\d+)><(.+?)>" with "(.+?)"/);
        if (killMatch) {
          const [, , , killerSteamId, , , , victimSteamId, , weapon] = killMatch;
          
          await ctx.runMutation(internal.cs2LogHandlers.handlePlayerKill, {
            killerSteamId,
            victimSteamId,
            weapon,
          });
          continue;
        }
        
        // Round End
        const roundEndMatch = line.match(/Team "(CT|TERRORIST)" scored "(\d+)" with "(\d+)" players/);
        if (roundEndMatch) {
          const [, team, score] = roundEndMatch;
          
          await ctx.runMutation(internal.cs2LogHandlers.handleRoundEnd, {
            team,
            score: parseInt(score),
          });
          continue;
        }
        
        // Game Start - multiple possible triggers
        if (line.includes('World triggered "Game_Commencing"') || 
            line.includes('MatchStarted') || 
            line.includes('Match_Start') ||
            line.includes('warmup_end') ||
            line.includes('mp_warmup_end') ||
            line.includes('Warmup has ended')) {
          console.log("🎮 GAME START DETECTED:", line);
          await ctx.runMutation(internal.cs2LogHandlers.handleGameStart, {});
          continue;
        }
        
        // Game over detection removed - using DatHost match status polling instead
      }
      
      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("Error parsing CS2 logs:", error);
      return new Response("Error", { status: 500 });
    }
  }),
});

http.route({
  path: "/dathost-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    
    console.log("🔔🔔🔔 DATHOST WEBHOOK RECEIVED 🔔🔔🔔");
    console.log("Event type:", body.event);
    console.log("Full payload:", JSON.stringify(body, null, 2));

    // FASE 22: DatHost webhook events (match_finished, round_start, etc.)
    if (body.event === "match_finished") {
      console.log("🏁🏁🏁 MATCH_FINISHED EVENT DETECTED 🏁🏁🏁");
      const dathostMatchId = body.match_id;
      const winner = body.winner; // "team1" or "team2"
      const scoreTeam1 = body.team1_score || 0;
      const scoreTeam2 = body.team2_score || 0;

      console.log("Match ID:", dathostMatchId);
      console.log("Winner:", winner);
      console.log("Score:", scoreTeam1, "-", scoreTeam2);

      // Process match result
      await ctx.runMutation(internal.matchResults.processMatchResult, {
        dathostMatchId,
        winner,
        scoreTeam1,
        scoreTeam2,
      });
      
      // MEGA ATUALIZAÇÃO: Terminate server after match finishes
      await ctx.runAction(internal.dathostCore.terminateServer, {
        dathostMatchId,
      });
    }
    
    // MEGA ATUALIZAÇÃO: Detect game start via round_start webhook
    if (body.event === "round_start") {
      console.log("🎮 ROUND_START EVENT - Game may be starting!");
      const dathostMatchId = body.match_id;
      
      if (dathostMatchId) {
        // Trigger Fast-Track sync to check if we should force LIVE
        // Note: matchId needs to be looked up from dathostMatchId
        console.log("⚡ Triggering Fast-Track sync for:", dathostMatchId);
      }
    }

    // Handle server_empty event - players were kicked or left
    if (body.event === "server_empty") {
      console.log("🚨 DatHost server_empty event - all players left/kicked");
      // Server empty doesn't mean game ended - ignore
    }

    // For other events, just acknowledge
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// REMOVED - /game-end-notify endpoint not needed
// Using DatHost match status polling instead

export default http;
