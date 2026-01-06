import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * FASE 26: TORNEIOS AUTOMATIZADOS
 * Sistema de brackets que gere torneios do início ao fim sem intervenção manual
 */

/**
 * Create a new tournament
 */
export const createTournament = mutation({
  args: {
    name: v.string(),
    startDate: v.int64(),
    maxPlayers: v.float64(), // 8, 16, or 32
    prizePool: v.float64(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Validate maxPlayers
    if (![8, 16, 32].includes(args.maxPlayers)) {
      throw new Error("maxPlayers must be 8, 16, or 32");
    }

    const tournamentId = await ctx.db.insert("tournaments", {
      name: args.name,
      startDate: BigInt(args.startDate),
      maxPlayers: args.maxPlayers,
      prizePool: args.prizePool,
      status: "REGISTRATION",
      createdAt: BigInt(Date.now()),
    });

    console.log(`🏆 Tournament created: ${args.name} (${args.maxPlayers} players)`);

    return tournamentId;
  },
});

/**
 * Register for a tournament
 */
export const registerForTournament = mutation({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");

    if (tournament.status !== "REGISTRATION") {
      throw new Error("Tournament registration is closed");
    }

    // Check if already registered
    const existing = await ctx.db
      .query("tournament_entries")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .filter((q) => q.eq(q.field("userId"), user._id))
      .first();

    if (existing) {
      throw new Error("Already registered for this tournament");
    }

    // Check if tournament is full
    const entries = await ctx.db
      .query("tournament_entries")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    if (entries.length >= tournament.maxPlayers) {
      throw new Error("Tournament is full");
    }

    await ctx.db.insert("tournament_entries", {
      tournamentId: args.tournamentId,
      userId: user._id,
      createdAt: BigInt(Date.now()),
    });

    // Send notification
    await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
      userId: user._id,
      title: "Tournament Registration",
      message: `You're registered for ${tournament.name}!`,
      type: "TOURNAMENT",
      link: `/tournaments/${args.tournamentId}`,
    });

    console.log(`✅ User ${user.steamName || user.clerkId} registered for tournament ${tournament.name}`);

    return { success: true };
  },
});

/**
 * Generate bracket for tournament
 * Called when registration closes or manually by admin
 */
export const generateBracket = internalAction({
  args: {
    tournamentId: v.id("tournaments"),
  },
  handler: async (ctx, args) => {
    const tournament = await ctx.runMutation(internal.tournaments.getTournamentData, {
      tournamentId: args.tournamentId,
    });

    if (!tournament) {
      console.error("Tournament not found");
      return { success: false };
    }

    if (tournament.status !== "REGISTRATION") {
      console.error("Tournament already started");
      return { success: false };
    }

    const entries = await ctx.runMutation(internal.tournaments.getTournamentEntries, {
      tournamentId: args.tournamentId,
    });

    if (entries.length < 2) {
      console.error("Not enough players to start tournament");
      return { success: false };
    }

    // Shuffle players (Fisher-Yates shuffle)
    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Assign seeds
    for (let i = 0; i < shuffled.length; i++) {
      await ctx.runMutation(internal.tournaments.updateEntrySeed, {
        entryId: shuffled[i]._id,
        seed: i + 1,
      });
    }

    // Calculate number of rounds
    const numPlayers = shuffled.length;
    const numRounds = Math.ceil(Math.log2(numPlayers));

    console.log(`🎲 Shuffled ${numPlayers} players into ${numRounds} rounds`);

    // Generate bracket structure
    await ctx.runMutation(internal.tournaments.createBracketStructure, {
      tournamentId: args.tournamentId,
      players: shuffled.map((e) => e.userId),
      numRounds,
    });

    // Update tournament status
    await ctx.runMutation(internal.tournaments.updateTournamentStatus, {
      tournamentId: args.tournamentId,
      status: "ONGOING",
    });

    console.log(`✅ Bracket generated for tournament ${tournament.name}`);

    return { success: true };
  },
});

/**
 * Create bracket structure
 */
export const createBracketStructure = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
    players: v.array(v.id("users")),
    numRounds: v.float64(),
  },
  handler: async (ctx, args) => {
    const matchIds: Record<string, any> = {};

    // Create matches from finals backwards to round 1
    for (let round = args.numRounds; round >= 1; round--) {
      const matchesInRound = Math.pow(2, round - 1);

      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        const key = `${round}-${matchNum}`;

        // Determine next match
        let nextMatchId = undefined;
        if (round < args.numRounds) {
          const nextRound = round + 1;
          const nextMatchNum = Math.ceil(matchNum / 2);
          const nextKey = `${nextRound}-${nextMatchNum}`;
          nextMatchId = matchIds[nextKey];
        }

        // Assign players for round 1
        let player1Id = undefined;
        let player2Id = undefined;
        let status: "PENDING" | "READY" = "PENDING";

        if (round === 1) {
          const idx1 = (matchNum - 1) * 2;
          const idx2 = idx1 + 1;
          player1Id = args.players[idx1] || undefined;
          player2Id = args.players[idx2] || undefined;

          if (player1Id && player2Id) {
            status = "READY";
          }
        }

        const matchId = await ctx.db.insert("tournament_matches", {
          tournamentId: args.tournamentId,
          round,
          matchNumber: matchNum,
          player1Id,
          player2Id,
          nextMatchId,
          status,
        });

        matchIds[key] = matchId;

        // Notify players if match is ready
        if (status === "READY" && player1Id && player2Id) {
          await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
            userId: player1Id,
            title: "Tournament Match Ready!",
            message: `Your Round ${round} match is ready to start!`,
            type: "TOURNAMENT",
            link: `/tournaments/${args.tournamentId}`,
          });

          await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
            userId: player2Id,
            title: "Tournament Match Ready!",
            message: `Your Round ${round} match is ready to start!`,
            type: "TOURNAMENT",
            link: `/tournaments/${args.tournamentId}`,
          });
        }
      }
    }

    console.log(`📊 Created ${Object.keys(matchIds).length} tournament matches`);
  },
});

/**
 * Advance tournament after a match finishes
 * Called automatically when a match with tournamentId finishes
 */
export const advanceTournament = internalMutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || !match.winnerId) {
      console.log("⚠️ Match not found or no winner");
      return;
    }

    // Find tournament match
    const tournamentMatch = await ctx.db
      .query("tournament_matches")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (!tournamentMatch) {
      console.log("⚠️ Tournament match not found");
      return;
    }

    // Update tournament match with winner
    await ctx.db.patch(tournamentMatch._id, {
      winnerId: match.winnerId,
      status: "FINISHED",
    });

    console.log(`🏆 Tournament match finished. Winner: ${match.winnerId}`);

    // Advance winner to next match
    if (tournamentMatch.nextMatchId) {
      const nextMatch = await ctx.db.get(tournamentMatch.nextMatchId);
      if (!nextMatch) return;

      // Determine which slot to fill (player1 or player2)
      if (!nextMatch.player1Id) {
        await ctx.db.patch(tournamentMatch.nextMatchId, {
          player1Id: match.winnerId,
          status: nextMatch.player2Id ? "READY" : "PENDING",
        });
      } else if (!nextMatch.player2Id) {
        await ctx.db.patch(tournamentMatch.nextMatchId, {
          player2Id: match.winnerId,
          status: "READY",
        });
      }

      // If next match is now ready, notify both players
      const updatedNextMatch = await ctx.db.get(tournamentMatch.nextMatchId);
      if (updatedNextMatch?.status === "READY" && updatedNextMatch.player1Id && updatedNextMatch.player2Id) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
          userId: updatedNextMatch.player1Id,
          title: "Next Round Ready!",
          message: `Your Round ${updatedNextMatch.round} match is ready!`,
          type: "TOURNAMENT",
          link: `/tournaments/${tournamentMatch.tournamentId}`,
        });

        await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
          userId: updatedNextMatch.player2Id,
          title: "Next Round Ready!",
          message: `Your Round ${updatedNextMatch.round} match is ready!`,
          type: "TOURNAMENT",
          link: `/tournaments/${tournamentMatch.tournamentId}`,
        });

        console.log(`✅ Next match ready: Round ${updatedNextMatch.round}`);
      }
    } else {
      // This was the final match - tournament is over!
      await ctx.db.patch(tournamentMatch.tournamentId, {
        status: "FINISHED",
        winnerId: match.winnerId,
      });

      await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
        userId: match.winnerId,
        title: "🏆 Tournament Champion!",
        message: `Congratulations! You won the tournament!`,
        type: "TOURNAMENT",
        link: `/tournaments/${tournamentMatch.tournamentId}`,
      });

      console.log(`🎉 Tournament finished! Winner: ${match.winnerId}`);
    }
  },
});

// Helper mutations
export const getTournamentData = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tournamentId);
  },
});

export const getTournamentEntries = internalMutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tournament_entries")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();
  },
});

export const updateEntrySeed = internalMutation({
  args: { entryId: v.id("tournament_entries"), seed: v.float64() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.entryId, { seed: args.seed });
  },
});

export const updateTournamentStatus = internalMutation({
  args: {
    tournamentId: v.id("tournaments"),
    status: v.union(v.literal("REGISTRATION"), v.literal("ONGOING"), v.literal("FINISHED")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tournamentId, { status: args.status });
  },
});

/**
 * Get all tournaments
 */
export const getAllTournaments = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("tournaments").order("desc").take(50);
  },
});

/**
 * Get tournament bracket
 */
export const getTournamentBracket = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return null;

    const matches = await ctx.db
      .query("tournament_matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Enrich with player data
    const enriched = await Promise.all(
      matches.map(async (m) => {
        const player1 = m.player1Id ? await ctx.db.get(m.player1Id) : null;
        const player2 = m.player2Id ? await ctx.db.get(m.player2Id) : null;
        const winner = m.winnerId ? await ctx.db.get(m.winnerId) : null;

        return {
          ...m,
          player1,
          player2,
          winner,
        };
      })
    );

    return {
      tournament,
      matches: enriched,
    };
  },
});
