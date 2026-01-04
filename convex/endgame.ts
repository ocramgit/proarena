import { v } from "convex/values";
import { internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const ELO_CHANGE = 25;

export const processGameOver = internalMutation({
  args: {
    matchId: v.id("matches"),
    winningTeam: v.union(v.literal("teamA"), v.literal("teamB")),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      console.error("Match not found:", args.matchId);
      return;
    }

    if (match.state === "FINISHED" || match.state === "CANCELLED") {
      console.log("Match already finished or cancelled");
      return;
    }

    console.log("🏁 Processing game over for match:", args.matchId);
    console.log("Winner:", args.winningTeam);

    const winningTeamIds = args.winningTeam === "teamA" ? match.teamA : match.teamB;
    const losingTeamIds = args.winningTeam === "teamA" ? match.teamB : match.teamA;

    // Get all player stats
    const allStats = await ctx.db
      .query("player_stats")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    // Determine MVP (highest score/kills on winning team)
    let mvpId: Id<"users"> | undefined;
    let maxScore = -1;

    for (const userId of winningTeamIds) {
      const playerStat = allStats.find(s => s.userId === userId);
      if (playerStat) {
        const score = playerStat.kills * 2 + playerStat.assists + playerStat.mvps * 3;
        if (score > maxScore) {
          maxScore = score;
          mvpId = userId;
        }
      }
    }

    console.log("🏆 MVP determined:", mvpId);

    // Calculate and apply ELO changes
    const eloField = match.mode === "1v1" ? "elo_1v1" : "elo_5v5";

    // Winners: +25 ELO
    for (const userId of winningTeamIds) {
      const user = await ctx.db.get(userId);
      if (!user) continue;

      const oldElo = user[eloField];
      const newElo = oldElo + ELO_CHANGE;

      await ctx.db.patch(userId, {
        [eloField]: newElo,
      });

      // Update player stats with ELO change
      const playerStat = allStats.find(s => s.userId === userId);
      if (playerStat) {
        await ctx.db.patch(playerStat._id, {
          eloChange: ELO_CHANGE,
          oldElo: oldElo,
          newElo: newElo,
        });
      }

      console.log(`✅ ${userId}: ${oldElo} → ${newElo} (+${ELO_CHANGE})`);
    }

    // Losers: -25 ELO
    for (const userId of losingTeamIds) {
      const user = await ctx.db.get(userId);
      if (!user) continue;

      const oldElo = user[eloField];
      const newElo = Math.max(0, oldElo - ELO_CHANGE); // Don't go below 0

      await ctx.db.patch(userId, {
        [eloField]: newElo,
      });

      // Update player stats with ELO change
      const playerStat = allStats.find(s => s.userId === userId);
      if (playerStat) {
        await ctx.db.patch(playerStat._id, {
          eloChange: -ELO_CHANGE,
          oldElo: oldElo,
          newElo: newElo,
        });
      }

      console.log(`❌ ${userId}: ${oldElo} → ${newElo} (-${ELO_CHANGE})`);
    }

    // Determine winner ID (first player of winning team for now)
    const winnerId = winningTeamIds[0];

    // Update match state
    await ctx.db.patch(args.matchId, {
      state: "FINISHED",
      winnerId: winnerId,
      mvpId: mvpId,
      finishedAt: BigInt(Date.now()),
    });

    console.log("✅ Match state updated to FINISHED");

    // Create match history entry
    await ctx.db.insert("match_history", {
      matchId: args.matchId,
      mode: match.mode,
      map: match.selectedMap || "unknown",
      teamA: match.teamA,
      teamB: match.teamB,
      winnerId: winnerId,
      scoreTeamA: match.scoreTeamA || 0,
      scoreTeamB: match.scoreTeamB || 0,
      finishedAt: BigInt(Date.now()),
    });

    console.log("✅ Match history entry created");

    // Server cleanup will be handled separately
    console.log("⚠️ Server cleanup should be triggered manually or via webhook");

    return { success: true, mvpId, winnerId };
  },
});

export const cleanupServer = internalAction({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.runMutation(internal.endgame.getMatchForCleanup, {
      matchId: args.matchId,
    });

    if (!match?.dathostMatchId) {
      console.log("⚠️ No DatHost match ID, skipping server cleanup");
      return;
    }

    console.log("🧹 Cleaning up DatHost server:", match.dathostMatchId);

    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("Missing DatHost credentials");
      console.error("Required: DATHOST_USERNAME and DATHOST_PASSWORD");
      return;
    }

    const auth = btoa(`${username}:${password}`);

    try {
      // Step 1: Send RCON command to kick all players
      console.log("📡 Sending kickall RCON command...");
      const rconResponse = await fetch(
        `https://dathost.net/api/0.1/game-servers/${match.dathostMatchId}/console`,
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

      if (!rconResponse.ok) {
        console.error("Failed to send kickall command:", await rconResponse.text());
      } else {
        console.log("✅ Kickall command sent");
      }

      // Step 2: Stop the server
      console.log("🛑 Stopping DatHost server...");
      const stopResponse = await fetch(
        `https://dathost.net/api/0.1/game-servers/${match.dathostMatchId}/stop`,
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

      // Wait 5 seconds before deleting
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Step 3: Delete the server
      console.log("🗑️ Deleting DatHost server...");
      const deleteResponse = await fetch(
        `https://dathost.net/api/0.1/game-servers/${match.dathostMatchId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!deleteResponse.ok) {
        console.error("Failed to delete server:", await deleteResponse.text());
      } else {
        console.log("✅ Server deleted successfully");
      }
    } catch (error) {
      console.error("Error during server cleanup:", error);
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

export const cancelMatch = internalMutation({
  args: {
    matchId: v.id("matches"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      console.error("Match not found:", args.matchId);
      return;
    }

    if (match.state === "FINISHED" || match.state === "CANCELLED") {
      console.log("Match already finished or cancelled");
      return;
    }

    console.log("❌ Cancelling match:", args.matchId, "Reason:", args.reason);

    // Update match state to CANCELLED
    await ctx.db.patch(args.matchId, {
      state: "CANCELLED",
      finishedAt: BigInt(Date.now()),
    });

    // NO ELO changes for cancelled matches
    console.log("⚠️ Server cleanup should be triggered separately");

    console.log("✅ Match cancelled, server cleanup scheduled");

    return { success: true };
  },
});
