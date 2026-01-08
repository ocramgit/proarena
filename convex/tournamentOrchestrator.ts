/**
 * FASE 52: TOURNAMENT ORCHESTRATOR
 * 
 * Automated tournament flow:
 * 1. Watch for SCHEDULED matches (both teams ready)
 * 2. Auto-create server with whitelist
 * 3. Detect match end and advance bracket
 * 4. Chain reaction for next matches
 */

import { v } from "convex/values";
import { mutation, internalMutation, internalAction, query, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * Tournament Match Dispatcher
 * Called periodically or after tournament status changes
 * Finds SCHEDULED matches and creates servers for them
 */
export const dispatchTournamentMatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    console.log("🔍 [DISPATCHER] Checking for ready tournament matches...");

    // Find all ongoing tournaments
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_status", (q) => q.eq("status", "ONGOING"))
      .collect();

    for (const tournament of tournaments) {
      // Find SCHEDULED matches (both teams assigned, ready to start)
      const matches = await ctx.db
        .query("tournament_matches")
        .withIndex("by_tournament", (q) => q.eq("tournamentId", tournament._id))
        .filter((q) => q.eq(q.field("status"), "SCHEDULED"))
        .collect();

      for (const match of matches) {
        // Skip if already has a game match linked
        if (match.matchId) {
          console.log(`⏭️ [DISPATCHER] Match ${match._id} already has game linked`);
          continue;
        }

        // Get both teams
        if (!match.team1Id || !match.team2Id) {
          console.log(`⏭️ [DISPATCHER] Match ${match._id} missing teams`);
          continue;
        }

        const team1 = await ctx.db.get(match.team1Id);
        const team2 = await ctx.db.get(match.team2Id);

        if (!team1 || !team2) {
          console.log(`⏭️ [DISPATCHER] Match ${match._id} teams not found`);
          continue;
        }

        console.log(`🎮 [DISPATCHER] Creating server for: ${team1.name} vs ${team2.name}`);

        // Schedule server creation
        await ctx.scheduler.runAfter(0, internal.tournamentOrchestrator.createTournamentMatchServer, {
          tournamentMatchId: match._id,
          tournamentId: tournament._id,
          team1Id: match.team1Id,
          team2Id: match.team2Id,
          mode: tournament.mode,
        });
      }
    }
  },
});

/**
 * Create server for a tournament match
 */
export const createTournamentMatchServer = internalAction({
  args: {
    tournamentMatchId: v.id("tournament_matches"),
    tournamentId: v.id("tournaments"),
    team1Id: v.id("tournament_teams"),
    team2Id: v.id("tournament_teams"),
    mode: v.union(v.literal("1v1"), v.literal("2v2"), v.literal("5v5")),
  },
  handler: async (ctx, args) => {
    console.log("🚀 [TOURNAMENT] Creating server for tournament match:", args.tournamentMatchId);

    // Get teams and their members
    const team1 = await ctx.runQuery(internal.tournamentOrchestrator.getTeamWithMembers, { teamId: args.team1Id });
    const team2 = await ctx.runQuery(internal.tournamentOrchestrator.getTeamWithMembers, { teamId: args.team2Id });

    if (!team1 || !team2) {
      console.error("❌ [TOURNAMENT] Teams not found");
      return;
    }

    // Collect all Steam IDs for whitelist
    const allSteamIds: string[] = [];
    const team1UserIds: Id<"users">[] = [];
    const team2UserIds: Id<"users">[] = [];

    for (const member of team1.members) {
      if (member.steamId) {
        allSteamIds.push(member.steamId);
        team1UserIds.push(member._id);
      }
    }

    for (const member of team2.members) {
      if (member.steamId) {
        allSteamIds.push(member.steamId);
        team2UserIds.push(member._id);
      }
    }

    console.log("👥 [TOURNAMENT] Whitelist:", allSteamIds);

    // Create game match record
    const gameMatchId = await ctx.runMutation(internal.tournamentOrchestrator.createGameMatch, {
      tournamentMatchId: args.tournamentMatchId,
      tournamentId: args.tournamentId,
      mode: args.mode,
      team1UserIds,
      team2UserIds,
      whitelistedPlayers: allSteamIds,
    });

    if (!gameMatchId) {
      console.error("❌ [TOURNAMENT] Failed to create game match");
      return;
    }

    // Get first player from each team for server creation
    const playerASteamId = allSteamIds[0] || "";
    const playerBSteamId = allSteamIds[team1.members.length] || allSteamIds[1] || "";

    // Create server via DatHost
    await ctx.runAction(internal.dathostCore.createServer, {
      matchId: gameMatchId,
      map: "de_dust2", // Default map for tournaments
      playerASteamId,
      playerBSteamId,
    });

    console.log("✅ [TOURNAMENT] Server creation initiated for match:", gameMatchId);
  },
});

/**
 * Get team with member details
 */
export const getTeamWithMembers = internalQuery({
  args: { teamId: v.id("tournament_teams") },
  handler: async (ctx, args) => {
    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const members = [];
    for (const memberId of team.members) {
      const user = await ctx.db.get(memberId);
      if (user) {
        members.push(user);
      }
    }

    return { ...team, members };
  },
});

/**
 * Create game match for tournament
 */
export const createGameMatch = internalMutation({
  args: {
    tournamentMatchId: v.id("tournament_matches"),
    tournamentId: v.id("tournaments"),
    mode: v.union(v.literal("1v1"), v.literal("2v2"), v.literal("5v5")),
    team1UserIds: v.array(v.id("users")),
    team2UserIds: v.array(v.id("users")),
    whitelistedPlayers: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    // Create the game match - map 2v2 to 5v5 for match schema
    const matchMode = args.mode === "2v2" ? "5v5" : args.mode;
    const matchId = await ctx.db.insert("matches", {
      state: "CONFIGURING",
      mode: matchMode,
      teamA: args.team1UserIds,
      teamB: args.team2UserIds,
      mapPool: ["de_dust2", "de_mirage", "de_inferno"],
      bannedMaps: [],
      selectedMap: "de_dust2",
      whitelistedPlayers: args.whitelistedPlayers,
    });

    // Link to tournament match
    await ctx.db.patch(args.tournamentMatchId, {
      matchId,
      status: "LIVE",
      startedAt: BigInt(Date.now()),
    });

    // Create player stats for all players
    for (const userId of [...args.team1UserIds, ...args.team2UserIds]) {
      await ctx.db.insert("player_stats", {
        matchId,
        userId,
        kills: 0,
        deaths: 0,
        assists: 0,
        mvps: 0,
        connected: false,
      });
    }

    console.log("✅ [TOURNAMENT] Game match created:", matchId);
    return matchId;
  },
});

/**
 * Process tournament match end
 * Called when a game match finishes
 */
export const processTournamentMatchEnd = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    console.log("🏁 [TOURNAMENT] Processing match end for tournament...");

    const match = await ctx.db.get(args.matchId);
    if (!match) return;

    // Find linked tournament match
    const tournamentMatch = await ctx.db
      .query("tournament_matches")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (!tournamentMatch) {
      console.log("⚠️ [TOURNAMENT] No tournament match linked");
      return;
    }

    const tournament = await ctx.db.get(tournamentMatch.tournamentId);
    if (!tournament) return;

    // Get scores
    const scoreA = match.scoreTeamA || 0;
    const scoreB = match.scoreTeamB || 0;

    // Determine winner team
    let winnerTeamId: Id<"tournament_teams"> | undefined;
    let loserTeamId: Id<"tournament_teams"> | undefined;

    if (scoreA > scoreB) {
      winnerTeamId = tournamentMatch.team1Id;
      loserTeamId = tournamentMatch.team2Id;
    } else if (scoreB > scoreA) {
      winnerTeamId = tournamentMatch.team2Id;
      loserTeamId = tournamentMatch.team1Id;
    } else {
      // Draw - random winner
      if (Math.random() < 0.5) {
        winnerTeamId = tournamentMatch.team1Id;
        loserTeamId = tournamentMatch.team2Id;
      } else {
        winnerTeamId = tournamentMatch.team2Id;
        loserTeamId = tournamentMatch.team1Id;
      }
    }

    if (!winnerTeamId || !loserTeamId) {
      console.error("❌ [TOURNAMENT] Could not determine winner");
      return;
    }

    console.log(`🏆 [TOURNAMENT] Winner team: ${winnerTeamId}, Score: ${scoreA}-${scoreB}`);

    // Update tournament match
    await ctx.db.patch(tournamentMatch._id, {
      winnerId: winnerTeamId,
      loserId: loserTeamId,
      score1: scoreA,
      score2: scoreB,
      status: "FINISHED",
      finishedAt: BigInt(Date.now()),
    });

    // Mark loser as eliminated
    await ctx.db.patch(loserTeamId, { eliminated: true });

    // Advance winner to next match
    if (tournamentMatch.nextMatchId) {
      await ctx.scheduler.runAfter(0, internal.tournamentOrchestrator.advanceWinner, {
        nextMatchId: tournamentMatch.nextMatchId,
        winnerTeamId,
        tournamentId: tournamentMatch.tournamentId,
      });
    } else {
      // This was the final - tournament over!
      const winnerTeam = await ctx.db.get(winnerTeamId);
      
      await ctx.db.patch(tournamentMatch.tournamentId, {
        status: "FINISHED",
        winnerId: winnerTeam?.captainId,
        updatedAt: BigInt(Date.now()),
      });

      // Distribute prizes
      await ctx.scheduler.runAfter(0, internal.tournamentOrchestrator.distributePrizes, {
        tournamentId: tournamentMatch.tournamentId,
        winnerTeamId,
        secondPlaceTeamId: loserTeamId,
      });

      console.log("🎉 [TOURNAMENT] Tournament finished!");
    }

    // Delete server
    if (match.dathostServerId) {
      await ctx.scheduler.runAfter(5000, internal.dathostCore.deleteServer, {
        serverId: match.dathostServerId,
      });
    }
  },
});

/**
 * Advance winner to next match slot
 */
export const advanceWinner = internalMutation({
  args: {
    nextMatchId: v.id("tournament_matches"),
    winnerTeamId: v.id("tournament_teams"),
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const nextMatch = await ctx.db.get(args.nextMatchId);
    if (!nextMatch) return;

    // Fill the first empty slot
    if (!nextMatch.team1Id) {
      await ctx.db.patch(args.nextMatchId, { team1Id: args.winnerTeamId });
      console.log(`➡️ [ADVANCE] Winner ${args.winnerTeamId} -> slot 1 of match ${args.nextMatchId}`);
    } else if (!nextMatch.team2Id) {
      await ctx.db.patch(args.nextMatchId, { 
        team2Id: args.winnerTeamId,
        status: "SCHEDULED", // Both teams now ready!
      });
      console.log(`➡️ [ADVANCE] Winner ${args.winnerTeamId} -> slot 2 of match ${args.nextMatchId}`);

      // CHAIN REACTION: Dispatch to create server for this match
      await ctx.scheduler.runAfter(2000, internal.tournamentOrchestrator.dispatchTournamentMatches, {});
    }
  },
});

/**
 * Distribute tournament prizes
 */
export const distributePrizes = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
    winnerTeamId: v.id("tournament_teams"),
    secondPlaceTeamId: v.optional(v.id("tournament_teams")),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament || tournament.prizeMode !== "SOBERANAS" || !tournament.prizePool) {
      return;
    }

    const dist = tournament.distribution || [100, 0, 0];
    const prize1 = (tournament.prizePool * dist[0]) / 100;
    const prize2 = (tournament.prizePool * dist[1]) / 100;

    // Award 1st place
    const winnerTeam = await ctx.db.get(args.winnerTeamId);
    if (winnerTeam) {
      const perMember = prize1 / winnerTeam.members.length;
      for (const memberId of winnerTeam.members) {
        const member = await ctx.db.get(memberId);
        if (member) {
          await ctx.db.patch(memberId, {
            balance: (member.balance || 0) + perMember,
          });
          console.log(`💰 [PRIZE] ${memberId} receives ${perMember} Soberanas (1st place)`);
        }
      }
    }

    // Award 2nd place
    if (args.secondPlaceTeamId && prize2 > 0) {
      const secondTeam = await ctx.db.get(args.secondPlaceTeamId);
      if (secondTeam) {
        const perMember = prize2 / secondTeam.members.length;
        for (const memberId of secondTeam.members) {
          const member = await ctx.db.get(memberId);
          if (member) {
            await ctx.db.patch(memberId, {
              balance: (member.balance || 0) + perMember,
            });
            console.log(`💰 [PRIZE] ${memberId} receives ${perMember} Soberanas (2nd place)`);
          }
        }
      }
    }

    console.log("✅ [PRIZE] Prizes distributed!");
  },
});

/**
 * Force match result (Admin override)
 */
export const forceMatchResult = mutation({
  args: {
    tournamentMatchId: v.id("tournament_matches"),
    winnerTeamId: v.id("tournament_teams"),
    score1: v.optional(v.float64()),
    score2: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check organizer permission
    const email = identity.email || "";
    const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "marstrabalhar@gmail.com";
    
    let canForce: boolean = email === SUPER_ADMIN_EMAIL;
    if (!canForce) {
      const staffMember = await ctx.db
        .query("staff_members")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      canForce = !!(staffMember && (staffMember.role === "ADMIN" || staffMember.role === "ORGANIZER"));
    }

    if (!canForce) {
      throw new Error("Acesso negado. Apenas ORGANIZER ou ADMIN.");
    }

    const match = await ctx.db.get(args.tournamentMatchId);
    if (!match) throw new Error("Match not found");

    const loserTeamId = match.team1Id === args.winnerTeamId ? match.team2Id : match.team1Id;

    // Update tournament match
    await ctx.db.patch(args.tournamentMatchId, {
      winnerId: args.winnerTeamId,
      loserId: loserTeamId,
      score1: args.score1 || 13,
      score2: args.score2 || 0,
      status: "FINISHED",
      finishedAt: BigInt(Date.now()),
    });

    // Mark loser as eliminated
    if (loserTeamId) {
      await ctx.db.patch(loserTeamId, { eliminated: true });
    }

    // Delete linked game server if exists
    if (match.matchId) {
      const gameMatch = await ctx.db.get(match.matchId);
      if (gameMatch?.dathostServerId) {
        await ctx.scheduler.runAfter(0, internal.dathostCore.deleteServer, {
          serverId: gameMatch.dathostServerId,
        });
      }
      // Mark game match as finished
      await ctx.db.patch(match.matchId, {
        state: "FINISHED",
        scoreTeamA: args.score1 || 13,
        scoreTeamB: args.score2 || 0,
        finishedAt: BigInt(Date.now()),
      });
    }

    // Advance winner
    if (match.nextMatchId) {
      await ctx.scheduler.runAfter(0, internal.tournamentOrchestrator.advanceWinner, {
        nextMatchId: match.nextMatchId,
        winnerTeamId: args.winnerTeamId,
        tournamentId: match.tournamentId,
      });
    } else {
      // Finals - end tournament
      const winnerTeam = await ctx.db.get(args.winnerTeamId);
      await ctx.db.patch(match.tournamentId, {
        status: "FINISHED",
        winnerId: winnerTeam?.captainId,
        updatedAt: BigInt(Date.now()),
      });

      // Distribute prizes
      await ctx.scheduler.runAfter(0, internal.tournamentOrchestrator.distributePrizes, {
        tournamentId: match.tournamentId,
        winnerTeamId: args.winnerTeamId,
        secondPlaceTeamId: loserTeamId,
      });
    }

    console.log(`⚡ [FORCE] Admin forced result: ${args.winnerTeamId} wins`);
    return { success: true };
  },
});

/**
 * Start tournament dispatcher (called when tournament starts)
 */
export const startTournamentDispatcher = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    console.log("🚀 [DISPATCHER] Starting tournament dispatcher for:", args.tournamentId);
    
    // Initial dispatch
    await ctx.scheduler.runAfter(0, internal.tournamentOrchestrator.dispatchTournamentMatches, {});
  },
});
