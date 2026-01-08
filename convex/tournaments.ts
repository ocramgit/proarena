import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * FASE 51: TOURNAMENT SYSTEM (EXPANDED)
 * Full tournament management with brackets, prizes, and live updates
 */

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || "marstrabalhar@gmail.com";

// Helper to check organizer permission
async function checkOrganizerPermission(ctx: any): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) return false;
  
  if (identity.email === SUPER_ADMIN_EMAIL) return true;
  
  const staffMember = await ctx.db
    .query("staff_members")
    .withIndex("by_email", (q: any) => q.eq("email", identity.email))
    .first();
  
  return staffMember && (staffMember.role === "ADMIN" || staffMember.role === "ORGANIZER");
}

/**
 * Create a new tournament (ORGANIZER/ADMIN only)
 */
export const createTournament = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    startDate: v.int64(),
    checkInMinutes: v.optional(v.float64()), // Minutes before start for check-in
    mode: v.union(v.literal("1v1"), v.literal("2v2"), v.literal("5v5")),
    maxTeams: v.float64(), // 4, 8, 16, 32, 64
    seedType: v.union(v.literal("RANDOM"), v.literal("MANUAL"), v.literal("ELO")),
    prizeMode: v.union(v.literal("CUSTOM"), v.literal("SOBERANAS")),
    // Custom prizes
    prize1st: v.optional(v.string()),
    prize2nd: v.optional(v.string()),
    prize3rd: v.optional(v.string()),
    // Soberanas prizes
    prizePool: v.optional(v.float64()),
    buyIn: v.optional(v.float64()),
    distribution: v.optional(v.array(v.float64())), // [50, 30, 20]
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Check organizer permission
    const canOrganize = await checkOrganizerPermission(ctx);
    if (!canOrganize) {
      throw new Error("Acesso negado. Apenas ORGANIZER ou ADMIN.");
    }

    // Validate maxTeams (must be power of 2)
    if (![4, 8, 16, 32, 64].includes(args.maxTeams)) {
      throw new Error("maxTeams must be 4, 8, 16, 32, or 64");
    }

    // Get current user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    
    if (!user) throw new Error("User not found");

    // Calculate check-in date
    const checkInDate = args.checkInMinutes 
      ? BigInt(Number(args.startDate) - args.checkInMinutes * 60 * 1000)
      : undefined;

    const tournamentId = await ctx.db.insert("tournaments", {
      name: args.name,
      description: args.description,
      bannerUrl: args.bannerUrl,
      startDate: args.startDate,
      checkInDate,
      mode: args.mode,
      maxTeams: args.maxTeams,
      currentTeams: 0,
      seedType: args.seedType,
      prizeMode: args.prizeMode,
      prize1st: args.prize1st,
      prize2nd: args.prize2nd,
      prize3rd: args.prize3rd,
      prizePool: args.prizePool,
      buyIn: args.buyIn,
      distribution: args.distribution,
      status: "DRAFT",
      createdBy: user._id,
      createdAt: BigInt(Date.now()),
    });

    console.log(`🏆 Tournament created: ${args.name} (${args.maxTeams} teams, ${args.mode})`);

    return tournamentId;
  },
});

/**
 * Publish tournament (opens registration)
 */
export const publishTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const canOrganize = await checkOrganizerPermission(ctx);
    if (!canOrganize) throw new Error("Acesso negado");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    if (tournament.status !== "DRAFT") throw new Error("Tournament already published");

    await ctx.db.patch(args.tournamentId, { 
      status: "REGISTRATION",
      updatedAt: BigInt(Date.now()),
    });

    console.log(`📢 Tournament published: ${tournament.name}`);
    return { success: true };
  },
});

/**
 * Register team for tournament
 */
export const registerTeam = mutation({
  args: {
    tournamentId: v.id("tournaments"),
    teamName: v.string(),
    memberIds: v.optional(v.array(v.id("users"))), // For team modes
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
    if (tournament.status !== "REGISTRATION") throw new Error("Registration closed");

    // Check if already registered
    const existingTeam = await ctx.db
      .query("tournament_teams")
      .withIndex("by_captain", (q) => q.eq("captainId", user._id))
      .filter((q) => q.eq(q.field("tournamentId"), args.tournamentId))
      .first();
    if (existingTeam) throw new Error("Already registered");

    // Check capacity
    const teams = await ctx.db
      .query("tournament_teams")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();
    if (teams.length >= tournament.maxTeams) throw new Error("Tournament full");

    // Build members array
    let members = [user._id];
    if (args.memberIds) {
      members = [...members, ...args.memberIds.filter(id => id !== user._id)];
    }

    // Validate team size for mode
    const requiredSize = tournament.mode === "1v1" ? 1 : tournament.mode === "2v2" ? 2 : 5;
    if (members.length !== requiredSize) {
      throw new Error(`Team must have exactly ${requiredSize} member(s) for ${tournament.mode}`);
    }

    // Deduct buy-in if applicable
    if (tournament.buyIn && tournament.buyIn > 0) {
      if (!user.balance || user.balance < tournament.buyIn) {
        throw new Error("Saldo insuficiente para buy-in");
      }
      await ctx.db.patch(user._id, {
        balance: (user.balance || 0) - tournament.buyIn,
      });
    }

    const teamId = await ctx.db.insert("tournament_teams", {
      tournamentId: args.tournamentId,
      name: args.teamName,
      captainId: user._id,
      members,
      createdAt: BigInt(Date.now()),
    });

    // Update team count
    await ctx.db.patch(args.tournamentId, {
      currentTeams: (tournament.currentTeams || 0) + 1,
    });

    console.log(`✅ Team "${args.teamName}" registered for ${tournament.name}`);
    return teamId;
  },
});

/**
 * Start tournament (generate bracket)
 */
export const startTournament = mutation({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const canOrganize = await checkOrganizerPermission(ctx);
    if (!canOrganize) throw new Error("Acesso negado");

    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    if (tournament.status !== "REGISTRATION" && tournament.status !== "CHECKIN") {
      throw new Error("Cannot start tournament in current state");
    }

    const teams = await ctx.db
      .query("tournament_teams")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    if (teams.length < 2) throw new Error("Need at least 2 teams");

    // Seed teams based on seedType
    let seededTeams = [...teams];
    if (tournament.seedType === "RANDOM") {
      // Fisher-Yates shuffle
      for (let i = seededTeams.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [seededTeams[i], seededTeams[j]] = [seededTeams[j], seededTeams[i]];
      }
    }
    // TODO: ELO-based seeding

    // Assign seeds
    for (let i = 0; i < seededTeams.length; i++) {
      await ctx.db.patch(seededTeams[i]._id, { seed: i + 1 });
    }

    // Generate bracket
    const numTeams = seededTeams.length;
    const numRounds = Math.ceil(Math.log2(numTeams));
    const totalSlots = Math.pow(2, numRounds);
    
    // Pad with byes if needed
    const paddedTeams: (typeof seededTeams[0] | null)[] = [...seededTeams];
    while (paddedTeams.length < totalSlots) {
      paddedTeams.push(null); // BYE
    }

    // Create matches for each round
    let previousRoundMatches: Id<"tournament_matches">[] = [];
    
    for (let round = 1; round <= numRounds; round++) {
      const matchesInRound = Math.pow(2, numRounds - round);
      const currentRoundMatches: Id<"tournament_matches">[] = [];

      for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
        let team1Id: Id<"tournament_teams"> | undefined;
        let team2Id: Id<"tournament_teams"> | undefined;
        let status: "TBD" | "SCHEDULED" | "LIVE" | "FINISHED" = "TBD";

        if (round === 1) {
          // First round - assign teams
          const idx1 = (matchNum - 1) * 2;
          const idx2 = idx1 + 1;
          team1Id = paddedTeams[idx1]?._id;
          team2Id = paddedTeams[idx2]?._id;

          if (team1Id && team2Id) {
            status = "SCHEDULED";
          } else if (team1Id || team2Id) {
            // One team gets a bye - auto advance
            status = "FINISHED";
          }
        }

        const matchId = await ctx.db.insert("tournament_matches", {
          tournamentId: args.tournamentId,
          round,
          matchNumber: matchNum,
          team1Id,
          team2Id,
          winnerId: (!team1Id && team2Id) ? team2Id : (!team2Id && team1Id) ? team1Id : undefined,
          status,
        });

        currentRoundMatches.push(matchId);

        // Link previous round matches to this one
        if (round > 1 && previousRoundMatches.length > 0) {
          const prevIdx1 = (matchNum - 1) * 2;
          const prevIdx2 = prevIdx1 + 1;
          if (previousRoundMatches[prevIdx1]) {
            await ctx.db.patch(previousRoundMatches[prevIdx1], { nextMatchId: matchId });
          }
          if (previousRoundMatches[prevIdx2]) {
            await ctx.db.patch(previousRoundMatches[prevIdx2], { nextMatchId: matchId });
          }
        }
      }

      previousRoundMatches = currentRoundMatches;
    }

    // Advance bye winners to next round
    const firstRoundMatches = await ctx.db
      .query("tournament_matches")
      .withIndex("by_round", (q) => q.eq("tournamentId", args.tournamentId).eq("round", 1))
      .collect();

    for (const match of firstRoundMatches) {
      if (match.winnerId && match.nextMatchId) {
        const nextMatch = await ctx.db.get(match.nextMatchId);
        if (nextMatch) {
          if (!nextMatch.team1Id) {
            await ctx.db.patch(match.nextMatchId, { team1Id: match.winnerId });
          } else if (!nextMatch.team2Id) {
            await ctx.db.patch(match.nextMatchId, { 
              team2Id: match.winnerId,
              status: "SCHEDULED",
            });
          }
        }
      }
    }

    await ctx.db.patch(args.tournamentId, {
      status: "ONGOING",
      updatedAt: BigInt(Date.now()),
    });

    // FASE 52: Start tournament dispatcher to auto-create servers
    await ctx.scheduler.runAfter(1000, internal.tournamentOrchestrator.startTournamentDispatcher, {
      tournamentId: args.tournamentId,
    });

    console.log(`🚀 Tournament started: ${tournament.name} with ${teams.length} teams`);
    return { success: true, rounds: numRounds };
  },
});

/**
 * Report match result
 */
export const reportMatchResult = mutation({
  args: {
    matchId: v.id("tournament_matches"),
    winnerId: v.id("tournament_teams"),
    score1: v.optional(v.float64()),
    score2: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const canOrganize = await checkOrganizerPermission(ctx);
    if (!canOrganize) throw new Error("Acesso negado");

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Match not found");
    if (match.status === "FINISHED") throw new Error("Match already finished");

    const loserId = match.team1Id === args.winnerId ? match.team2Id : match.team1Id;

    await ctx.db.patch(args.matchId, {
      winnerId: args.winnerId,
      loserId,
      score1: args.score1,
      score2: args.score2,
      status: "FINISHED",
      finishedAt: BigInt(Date.now()),
    });

    // Mark loser as eliminated
    if (loserId) {
      await ctx.db.patch(loserId, { eliminated: true });
    }

    // Advance winner to next match
    if (match.nextMatchId) {
      const nextMatch = await ctx.db.get(match.nextMatchId);
      if (nextMatch) {
        if (!nextMatch.team1Id) {
          await ctx.db.patch(match.nextMatchId, { team1Id: args.winnerId });
        } else if (!nextMatch.team2Id) {
          await ctx.db.patch(match.nextMatchId, { 
            team2Id: args.winnerId,
            status: "SCHEDULED",
          });
        }
      }
    } else {
      // Finals - tournament over
      const tournament = await ctx.db.get(match.tournamentId);
      const winnerTeam = await ctx.db.get(args.winnerId);
      
      await ctx.db.patch(match.tournamentId, {
        status: "FINISHED",
        winnerId: winnerTeam?.captainId,
        updatedAt: BigInt(Date.now()),
      });

      // Distribute prizes if Soberanas mode
      if (tournament?.prizeMode === "SOBERANAS" && tournament.prizePool) {
        const dist = tournament.distribution || [100, 0, 0];
        const prize1 = (tournament.prizePool * dist[0]) / 100;
        
        if (winnerTeam) {
          for (const memberId of winnerTeam.members) {
            const memberPrize = prize1 / winnerTeam.members.length;
            const member = await ctx.db.get(memberId);
            if (member) {
              await ctx.db.patch(memberId, {
                balance: (member.balance || 0) + memberPrize,
              });
            }
          }
        }
      }

      console.log(`🎉 Tournament finished!`);
    }

    return { success: true };
  },
});

/**
 * Get all tournaments
 */
export const getAllTournaments = query({
  args: {},
  handler: async (ctx) => {
    const tournaments = await ctx.db
      .query("tournaments")
      .order("desc")
      .take(50);

    return tournaments.map(t => ({
      ...t,
      startDate: Number(t.startDate),
      createdAt: Number(t.createdAt),
    }));
  },
});

/**
 * Get tournament details with bracket
 */
export const getTournament = query({
  args: { tournamentId: v.id("tournaments") },
  handler: async (ctx, args) => {
    const tournament = await ctx.db.get(args.tournamentId);
    if (!tournament) return null;

    const teams = await ctx.db
      .query("tournament_teams")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    const matches = await ctx.db
      .query("tournament_matches")
      .withIndex("by_tournament", (q) => q.eq("tournamentId", args.tournamentId))
      .collect();

    // Enrich matches with team data
    const enrichedMatches = await Promise.all(
      matches.map(async (m) => {
        const team1 = m.team1Id ? await ctx.db.get(m.team1Id) : null;
        const team2 = m.team2Id ? await ctx.db.get(m.team2Id) : null;
        const winner = m.winnerId ? await ctx.db.get(m.winnerId) : null;

        // Get captain info for display
        const team1Captain = team1?.captainId ? await ctx.db.get(team1.captainId) : null;
        const team2Captain = team2?.captainId ? await ctx.db.get(team2.captainId) : null;

        return {
          ...m,
          team1: team1 ? { ...team1, captain: team1Captain } : null,
          team2: team2 ? { ...team2, captain: team2Captain } : null,
          winner,
        };
      })
    );

    // Group matches by round
    const rounds: Record<number, typeof enrichedMatches> = {};
    for (const match of enrichedMatches) {
      if (!rounds[match.round]) rounds[match.round] = [];
      rounds[match.round].push(match);
    }

    // Sort matches within each round
    for (const round of Object.keys(rounds)) {
      rounds[Number(round)].sort((a, b) => a.matchNumber - b.matchNumber);
    }

    return {
      ...tournament,
      startDate: Number(tournament.startDate),
      createdAt: Number(tournament.createdAt),
      teams,
      rounds,
      totalRounds: Object.keys(rounds).length,
    };
  },
});

/**
 * Check if user can organize (for frontend)
 */
export const canOrganize = query({
  args: {},
  handler: async (ctx) => {
    return await checkOrganizerPermission(ctx);
  },
});
