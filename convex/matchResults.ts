import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const ELO_CHANGE = 25;

export const processMatchResult = internalMutation({
  args: {
    dathostMatchId: v.string(),
    winner: v.string(), // "team1" or "team2"
    scoreTeam1: v.float64(),
    scoreTeam2: v.float64(),
  },
  handler: async (ctx, args) => {
    console.log("🏁 GAME END TRIGGERED");
    console.log("Winner:", args.winner, "Score:", args.scoreTeam1, "-", args.scoreTeam2);
    
    // Find match by dathostMatchId
    const matches = await ctx.db.query("matches").collect();
    const match = matches.find((m) => m.dathostMatchId === args.dathostMatchId);

    if (!match) {
      console.error("❌ Match not found");
      return { success: false, error: "Match not found" };
    }

    if (match.state === "FINISHED" || match.state === "CANCELLED") {
      console.log("⚠️ Already ended");
      return { success: false, error: "Match already ended" };
    }

    // Determine winner team
    const winningTeam = args.winner === "team1" ? match.teamA : match.teamB;
    const losingTeam = args.winner === "team1" ? match.teamB : match.teamA;

    // Update ELO
    for (const winnerId of winningTeam) {
      const winner = await ctx.db.get(winnerId);
      if (!winner) continue;
      const mode = match.mode;
      const currentElo = mode === "1v1" ? winner.elo_1v1 : winner.elo_5v5;
      const newElo = currentElo + ELO_CHANGE;
      if (mode === "1v1") {
        await ctx.db.patch(winnerId, { elo_1v1: newElo });
      } else {
        await ctx.db.patch(winnerId, { elo_5v5: newElo });
      }
    }

    for (const loserId of losingTeam) {
      const loser = await ctx.db.get(loserId);
      if (!loser) continue;
      const mode = match.mode;
      const currentElo = mode === "1v1" ? loser.elo_1v1 : loser.elo_5v5;
      const newElo = currentElo - ELO_CHANGE;
      if (mode === "1v1") {
        await ctx.db.patch(loserId, { elo_1v1: newElo });
      } else {
        await ctx.db.patch(loserId, { elo_5v5: newElo });
      }
    }

    // Mark as FINISHED
    await ctx.db.patch(match._id, {
      state: "FINISHED",
      scoreTeamA: args.scoreTeam1,
      scoreTeamB: args.scoreTeam2,
      winnerId: winningTeam[0],
      finishedAt: BigInt(Date.now()),
    });
    console.log("✅ Match FINISHED, ELO updated");

    // PHASE 12: Delete server IMMEDIATELY
    console.log("🗑️ Scheduling IMMEDIATE server deletion");
    await ctx.scheduler.runAfter(0, internal.matchResults.cleanupServer, {
      matchId: match._id,
    });
    
    return { success: true };
  },
});

// Server cleanup - restored from working forceCleanupServer
export const cleanupServer = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.runMutation(internal.matchResults.getMatchForCleanup, {
      matchId: args.matchId,
    });

    if (!match?.dathostServerId) {
      console.error("❌ No server ID");
      return;
    }

    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("❌ Missing credentials");
      return;
    }

    const auth = btoa(`${username}:${password}`);

    try {
      console.log("🔴 CLEANUP - Kicking all players from server:", match.dathostServerId);
      
      // Step 1: Kick all players
      const kickResponse = await fetch(
        `https://dathost.net/api/0.1/game-servers/${match.dathostServerId}/console`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            line: "kickall",
          }),
        }
      );

      if (!kickResponse.ok) {
        console.error("Failed to kick players:", await kickResponse.text());
      } else {
        console.log("✅ All players kicked");
      }

      // Wait 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 2: Stop the server
      console.log("🛑 Stopping DatHost server:", match.dathostServerId);
      const stopResponse = await fetch(
        `https://dathost.net/api/0.1/game-servers/${match.dathostServerId}/stop`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!stopResponse.ok) {
        console.error("Failed to stop server:", await stopResponse.text());
      } else {
        console.log("✅ Server stopped");
      }

      // Wait 3 seconds before deleting
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Step 3: Delete the server
      console.log("🗑️ DELETING DatHost server:", match.dathostServerId);
      const deleteResponse = await fetch(
        `https://dathost.net/api/0.1/game-servers/${match.dathostServerId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error("Failed to delete server:", errorText);
        throw new Error(`Failed to delete server: ${errorText}`);
      }

      console.log("✅ DatHost server DELETED successfully");

    } catch (error) {
      console.error("❌ Error during server cleanup:", error);
      throw error;
    }
  },
});

export const getMatchForCleanup = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.matchId);
  },
});
