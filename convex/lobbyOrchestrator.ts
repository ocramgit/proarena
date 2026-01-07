/**
 * FASE 60: LOBBY ORCHESTRATOR
 * 
 * Integrates with lobby.ts to trigger server creation when map is selected
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Triggered when map veto is complete and match enters CONFIGURING state
 */
export const onMapSelected = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.state !== "CONFIGURING") {
      console.log("⚠️ [ORCHESTRATOR] Match not in CONFIGURING state");
      return;
    }

    if (!match.selectedMap) {
      console.log("⚠️ [ORCHESTRATOR] No map selected");
      return;
    }

    if (match.provisioningStarted) {
      console.log("⚠️ [ORCHESTRATOR] Provisioning already started");
      return;
    }

    console.log("🎮 [ORCHESTRATOR] Map selected:", match.selectedMap);
    console.log("🚀 [ORCHESTRATOR] Starting server creation...");

    // Mark provisioning as started
    await ctx.db.patch(args.matchId, {
      provisioningStarted: true,
    });

    // Get player SteamIDs
    const playerA = await ctx.db.get(match.teamA[0]);
    const playerB = await ctx.db.get(match.teamB[0]);

    if (!playerA?.steamId || !playerB?.steamId) {
      console.error("❌ [ORCHESTRATOR] Players missing SteamIDs");
      return;
    }

    // Create server with selected location
    await ctx.scheduler.runAfter(0, internal.dathostCore.createServer, {
      matchId: args.matchId,
      map: match.selectedMap,
      location: match.selectedLocation,
      playerASteamId: playerA.steamId,
      playerBSteamId: playerB.steamId,
    });

    console.log("✅ [ORCHESTRATOR] Server creation initiated");
  },
});
