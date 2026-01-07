/**
 * FASE 60: LOG HANDLERS
 * 
 * Process CS2 log events and update match state
 */

import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { normalizeSteamId } from "./steamIdUtils";

/**
 * Handle player connection
 */
export const handlePlayerConnect = internalMutation({
  args: {
    steamId: v.string(),
    playerName: v.string(),
  },
  handler: async (ctx, args) => {
    const steamId64 = normalizeSteamId(args.steamId);
    console.log("👤 [CONNECT] Processing:", args.playerName, args.steamId, "->", steamId64);

    // Find active WARMUP match with this player
    const matches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "WARMUP"))
      .collect();

    for (const match of matches) {
      // Check if player is whitelisted
      if (match.whitelistedPlayers?.includes(steamId64)) {
        console.log("✅ [CONNECT] Authorized player in match:", match._id);

        // Mark player as connected in player_stats
        const existingStat = await ctx.db
          .query("player_stats")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect();

        // Find user by steamId
        let user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("steamId"), steamId64))
          .first();

        if (!user) {
          // Fallback: some DB rows may still have SteamID stored in non-64 format
          user = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("steamId"), args.steamId))
            .first();
        }

        if (!user) {
          console.error(
            "❌ [CONNECT] Whitelisted SteamID but user not found:",
            "raw=",
            args.steamId,
            "steam64=",
            steamId64,
            "matchId=",
            match._id
          );
          return;
        }

        if (user) {
          const stat = existingStat.find((s) => s.userId === user._id);
          if (stat) {
            await ctx.db.patch(stat._id, { connected: true });
          } else {
            await ctx.db.insert("player_stats", {
              matchId: match._id,
              userId: user._id,
              kills: 0,
              deaths: 0,
              assists: 0,
              mvps: 0,
              connected: true,
            });
          }

          console.log("✅ [CONNECT] Player marked as connected");

          // Check if both players are connected
          await ctx.scheduler.runAfter(0, internal.matchFlow.checkBothPlayersConnected, {
            matchId: match._id,
          });
        }

        return;
      }
    }

    console.log("⚠️ [CONNECT] Player not in any active match");
  },
});

/**
 * Handle team join
 */
export const handleTeamJoin = internalMutation({
  args: {
    steamId: v.string(),
    team: v.string(),
  },
  handler: async (ctx, args) => {
    const steamId64 = normalizeSteamId(args.steamId);
    console.log("🔄 [TEAM] Player joined:", args.team, args.steamId, "->", steamId64);

    // Find active match
    const matches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "WARMUP"))
      .collect();

    for (const match of matches) {
      if (match.whitelistedPlayers?.includes(steamId64)) {
        // Find user
        const user = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("steamId"), steamId64))
          .first();

        if (user) {
          // Store team assignment
          if (args.team === "CT") {
            await ctx.db.patch(match._id, { teamCtId: user._id });
          } else if (args.team === "TERRORIST") {
            await ctx.db.patch(match._id, { teamTId: user._id });
          }

          console.log("✅ [TEAM] Team assignment stored");
        }

        return;
      }
    }
  },
});

/**
 * Handle player kill
 */
export const handlePlayerKill = internalMutation({
  args: {
    killerSteamId: v.string(),
    victimSteamId: v.string(),
    weapon: v.string(),
  },
  handler: async (ctx, args) => {
    // Find active LIVE match
    const matches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "LIVE"))
      .collect();

    for (const match of matches) {
      if (match.whitelistedPlayers?.includes(args.killerSteamId)) {
        // Find killer and victim users
        const killer = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("steamId"), args.killerSteamId))
          .first();

        const victim = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("steamId"), args.victimSteamId))
          .first();

        if (killer && victim) {
          // Update killer stats
          const killerStat = await ctx.db
            .query("player_stats")
            .withIndex("by_user_match", (q) =>
              q.eq("userId", killer._id).eq("matchId", match._id)
            )
            .first();

          if (killerStat) {
            await ctx.db.patch(killerStat._id, {
              kills: killerStat.kills + 1,
            });
          }

          // Update victim stats
          const victimStat = await ctx.db
            .query("player_stats")
            .withIndex("by_user_match", (q) =>
              q.eq("userId", victim._id).eq("matchId", match._id)
            )
            .first();

          if (victimStat) {
            await ctx.db.patch(victimStat._id, {
              deaths: victimStat.deaths + 1,
            });
          }
        }

        return;
      }
    }
  },
});

/**
 * Handle round end
 */
export const handleRoundEnd = internalMutation({
  args: {
    winningTeam: v.string(),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    console.log("🏁 [ROUND END]", args.winningTeam, "scored", args.score);

    // Find active LIVE match
    const matches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "LIVE"))
      .collect();

    if (matches.length > 0) {
      const match = matches[0];

      // Update scores based on team
      if (args.winningTeam === "CT") {
        const currentScore = match.scoreTeamA || 0;
        await ctx.db.patch(match._id, {
          scoreTeamA: currentScore + 1,
          currentRound: (match.currentRound || 0) + 1,
        });
      } else {
        const currentScore = match.scoreTeamB || 0;
        await ctx.db.patch(match._id, {
          scoreTeamB: currentScore + 1,
          currentRound: (match.currentRound || 0) + 1,
        });
      }

      console.log("✅ [ROUND END] Scores updated");
    }
  },
});

/**
 * Handle game over
 */
export const handleGameOver = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🏆 [GAME OVER] Processing match end");

    // Find active LIVE match
    const matches = await ctx.db
      .query("matches")
      .filter((q) => q.eq(q.field("state"), "LIVE"))
      .collect();

    if (matches.length > 0) {
      const match = matches[0];

      // Determine winner
      const scoreA = match.scoreTeamA || 0;
      const scoreB = match.scoreTeamB || 0;
      const winnerId = scoreA > scoreB ? match.teamA[0] : match.teamB[0];

      // Mark match as FINISHED
      await ctx.db.patch(match._id, {
        state: "FINISHED",
        winnerId,
        finishedAt: BigInt(Date.now()),
      });

      console.log("✅ [GAME OVER] Match marked as FINISHED");

      // Schedule server cleanup
      if (match.dathostServerId) {
        await ctx.scheduler.runAfter(5000, internal.dathostCore.deleteServer, {
          serverId: match.dathostServerId,
        });
      }
    }
  },
});
