/**
 * FASE 60: MATCH END - Terminar jogo e processar resultados
 * 
 * Processa fim de jogo, calcula vencedor, atualiza ELO e apaga servidor
 */

import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

const ELO_CHANGE = 25;

/**
 * Terminar jogo manualmente (admin/force end)
 */
export const endMatch = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    if (match.state === "FINISHED" || match.state === "CANCELLED") {
      return { success: false, message: "Match already ended" };
    }

    console.log("🔴 [END MATCH] Force ending match:", args.matchId);

    // Process match end
    await ctx.scheduler.runAfter(0, internal.matchEnd.processMatchEnd, {
      matchId: args.matchId,
    });

    return { success: true, message: "Match ending..." };
  },
});

/**
 * Processar fim de jogo (chamado automaticamente ou manualmente)
 */
export const processMatchEnd = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      console.error("❌ [END] Match not found");
      return;
    }

    if (match.state === "FINISHED" || match.state === "CANCELLED") {
      console.log("⚠️ [END] Match already ended");
      return;
    }

    console.log("🏁 [END] Processing match end for:", args.matchId);

    const scoreA = match.scoreTeamA || 0;
    const scoreB = match.scoreTeamB || 0;

    // Determine winner
    let winnerId = null;
    if (scoreA > scoreB) {
      winnerId = match.teamA[0];
    } else if (scoreB > scoreA) {
      winnerId = match.teamB[0];
    } else {
      // Draw - pick random winner
      winnerId = Math.random() < 0.5 ? match.teamA[0] : match.teamB[0];
    }

    console.log("🏆 [END] Winner:", winnerId, `Score: ${scoreA} - ${scoreB}`);

    // Update ELO
    const winningTeam = winnerId === match.teamA[0] ? match.teamA : match.teamB;
    const losingTeam = winnerId === match.teamA[0] ? match.teamB : match.teamA;

    for (const playerId of winningTeam) {
      const player = await ctx.db.get(playerId);
      if (!player) continue;

      const mode = match.mode;
      const currentElo = mode === "1v1" ? player.elo_1v1 : player.elo_5v5;
      const newElo = currentElo + ELO_CHANGE;

      if (mode === "1v1") {
        await ctx.db.patch(playerId, { elo_1v1: newElo });
      } else {
        await ctx.db.patch(playerId, { elo_5v5: newElo });
      }

      console.log(`✅ [ELO] Winner ${playerId}: ${currentElo} → ${newElo}`);
    }

    for (const playerId of losingTeam) {
      const player = await ctx.db.get(playerId);
      if (!player) continue;

      const mode = match.mode;
      const currentElo = mode === "1v1" ? player.elo_1v1 : player.elo_5v5;
      const newElo = Math.max(0, currentElo - ELO_CHANGE);

      if (mode === "1v1") {
        await ctx.db.patch(playerId, { elo_1v1: newElo });
      } else {
        await ctx.db.patch(playerId, { elo_5v5: newElo });
      }

      console.log(`📉 [ELO] Loser ${playerId}: ${currentElo} → ${newElo}`);
    }

    // Mark match as FINISHED
    await ctx.db.patch(args.matchId, {
      state: "FINISHED",
      winnerId,
      finishedAt: BigInt(Date.now()),
    });

    console.log("✅ [END] Match marked as FINISHED");

    // Reward winner with Soberanas
    await ctx.scheduler.runAfter(0, internal.economy.rewardMatchWinner, {
      winnerId,
      loserId: losingTeam[0],
      matchId: args.matchId,
    });

    // Save to match history
    await ctx.scheduler.runAfter(0, internal.matchEnd.saveMatchHistory, {
      matchId: args.matchId,
      winnerId,
      scoreA,
      scoreB,
    });

    // Delete server
    if (match.dathostServerId) {
      console.log("🗑️ [END] Scheduling server deletion");
      await ctx.scheduler.runAfter(5000, internal.dathostCore.deleteServer, {
        serverId: match.dathostServerId,
      });
    }

    // FASE 52: Check if this is a tournament match and advance bracket
    await ctx.scheduler.runAfter(0, internal.tournamentOrchestrator.processTournamentMatchEnd, {
      matchId: args.matchId,
    });

    console.log("🎉 [END] Match processing complete!");
  },
});

/**
 * Save match to history
 */
export const saveMatchHistory = internalMutation({
  args: {
    matchId: v.id("matches"),
    winnerId: v.id("users"),
    scoreA: v.number(),
    scoreB: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    await ctx.db.insert("match_history", {
      matchId: args.matchId,
      mode: match.mode,
      map: match.selectedMap || "unknown",
      teamA: match.teamA,
      teamB: match.teamB,
      winnerId: args.winnerId,
      scoreTeamA: args.scoreA,
      scoreTeamB: args.scoreB,
      finishedAt: BigInt(Date.now()),
    });

    console.log("✅ [HISTORY] Match saved to history");
  },
});

/**
 * Cancelar match (timeout, player disconnect, etc)
 */
export const cancelMatch = mutation({
  args: {
    matchId: v.id("matches"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");

    if (match.state === "FINISHED" || match.state === "CANCELLED") {
      return { success: false, message: "Match already ended" };
    }

    console.log("❌ [CANCEL] Cancelling match:", args.matchId, "Reason:", args.reason);

    await ctx.db.patch(args.matchId, {
      state: "CANCELLED",
      finishedAt: BigInt(Date.now()),
    });

    // Delete server if exists
    if (match.dathostServerId) {
      await ctx.scheduler.runAfter(1000, internal.dathostCore.deleteServer, {
        serverId: match.dathostServerId,
      });
    }

    return { success: true, message: "Match cancelled" };
  },
});
