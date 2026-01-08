import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

/**
 * FASE 54: PROFESSIONAL MATCH ROOM
 * Veto System, Fan Voting, Head-to-Head
 */

const DEFAULT_MAP_POOL = [
  "de_ancient",
  "de_anubis", 
  "de_dust2",
  "de_inferno",
  "de_mirage",
  "de_nuke",
  "de_vertigo",
];

const VETO_PHASES = ["BAN1", "BAN2", "BAN3", "BAN4", "PICK1", "PICK2", "DECIDER", "COMPLETED"] as const;
const TURN_TIMEOUT_MS = 30000; // 30 seconds per turn

/**
 * Initialize veto for a match
 */
export const initializeVeto = mutation({
  args: {
    matchId: v.id("matches"),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    team1CaptainId: v.id("users"),
    team2CaptainId: v.id("users"),
    mapPool: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if veto already exists
    const existing = await ctx.db
      .query("match_vetos")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();
    if (existing) return existing._id;

    const now = BigInt(Date.now());
    const vetoId = await ctx.db.insert("match_vetos", {
      matchId: args.matchId,
      tournamentMatchId: args.tournamentMatchId,
      team1CaptainId: args.team1CaptainId,
      team2CaptainId: args.team2CaptainId,
      currentTurn: args.team1CaptainId, // Team 1 starts
      phase: "BAN1",
      mapPool: args.mapPool || DEFAULT_MAP_POOL,
      bans: [],
      picks: [],
      turnDeadline: BigInt(Date.now() + TURN_TIMEOUT_MS),
      createdAt: now,
    });

    console.log(`🗳️ [VETO] Initialized for match ${args.matchId}`);
    return vetoId;
  },
});

/**
 * Make a veto action (ban or pick)
 */
export const makeVetoAction = mutation({
  args: {
    vetoId: v.id("match_vetos"),
    map: v.string(),
    side: v.optional(v.string()), // For side pick: "CT" or "T"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    const veto = await ctx.db.get(args.vetoId);
    if (!veto) throw new Error("Veto not found");
    if (veto.phase === "COMPLETED") throw new Error("Veto already completed");
    if (veto.currentTurn !== user._id) throw new Error("Not your turn");

    const now = BigInt(Date.now());
    const isBanPhase = veto.phase.startsWith("BAN");
    const isPickPhase = veto.phase === "PICK1";
    const isSidePickPhase = veto.phase === "PICK2";
    const isDecider = veto.phase === "DECIDER";

    // Validate map is in pool and not already banned/picked
    const bannedMaps = veto.bans.map(b => b.map);
    const pickedMaps = veto.picks.map(p => p.map);
    const usedMaps = [...bannedMaps, ...pickedMaps];

    if (!isSidePickPhase && !veto.mapPool.includes(args.map)) {
      throw new Error("Map not in pool");
    }
    if (!isSidePickPhase && usedMaps.includes(args.map)) {
      throw new Error("Map already used");
    }

    // Determine next turn and phase
    const currentPhaseIdx = VETO_PHASES.indexOf(veto.phase);
    let nextPhase = VETO_PHASES[currentPhaseIdx + 1];
    let nextTurn = veto.currentTurn === veto.team1CaptainId 
      ? veto.team2CaptainId 
      : veto.team1CaptainId;

    // Build update
    const updates: Record<string, any> = {
      phase: nextPhase,
      currentTurn: nextTurn,
      turnDeadline: BigInt(Date.now() + TURN_TIMEOUT_MS),
    };

    if (isBanPhase) {
      updates.bans = [...veto.bans, { map: args.map, teamId: user._id, timestamp: now }];
    } else if (isPickPhase) {
      updates.picks = [...veto.picks, { map: args.map, teamId: user._id, timestamp: now }];
      updates.selectedMap = args.map;
    } else if (isSidePickPhase) {
      if (!args.side || !["CT", "T"].includes(args.side)) {
        throw new Error("Must pick side (CT or T)");
      }
      // Team 2 picks side, they picked the map in PICK1
      updates.picks = [...veto.picks, { map: veto.selectedMap || args.map, teamId: user._id, side: args.side, timestamp: now }];
      updates.selectedSide = args.side;
      updates.phase = "COMPLETED";
      updates.completedAt = now;
    } else if (isDecider) {
      // Remaining map is the decider
      const remaining = veto.mapPool.filter(m => !usedMaps.includes(m) && m !== args.map);
      if (remaining.length === 1) {
        updates.selectedMap = remaining[0];
      } else {
        updates.selectedMap = args.map;
      }
      updates.phase = "COMPLETED";
      updates.completedAt = now;
    }

    await ctx.db.patch(args.vetoId, updates);

    // If completed, update match with selected map
    if (updates.phase === "COMPLETED") {
      await ctx.db.patch(veto.matchId, {
        selectedMap: updates.selectedMap,
        state: "CONFIGURING",
      });
      console.log(`✅ [VETO] Completed: Map ${updates.selectedMap}`);
    }

    return { 
      success: true, 
      phase: updates.phase,
      selectedMap: updates.selectedMap,
    };
  },
});

/**
 * Get veto state
 */
export const getVeto = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const veto = await ctx.db
      .query("match_vetos")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    if (!veto) return null;

    // Get captain info
    const captain1 = await ctx.db.get(veto.team1CaptainId);
    const captain2 = await ctx.db.get(veto.team2CaptainId);

    // Calculate available maps
    const usedMaps = [...veto.bans.map(b => b.map), ...veto.picks.map(p => p.map)];
    const availableMaps = veto.mapPool.filter(m => !usedMaps.includes(m));

    return {
      ...veto,
      createdAt: Number(veto.createdAt),
      turnDeadline: veto.turnDeadline ? Number(veto.turnDeadline) : null,
      completedAt: veto.completedAt ? Number(veto.completedAt) : null,
      captain1: captain1 ? { _id: captain1._id, nickname: captain1.nickname, steamAvatar: captain1.steamAvatar } : null,
      captain2: captain2 ? { _id: captain2._id, nickname: captain2.nickname, steamAvatar: captain2.steamAvatar } : null,
      availableMaps,
      bans: veto.bans.map(b => ({ ...b, timestamp: Number(b.timestamp) })),
      picks: veto.picks.map(p => ({ ...p, timestamp: Number(p.timestamp) })),
    };
  },
});

/**
 * Cast fan vote
 */
export const castFanVote = mutation({
  args: {
    matchId: v.optional(v.id("matches")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
    votedForTeam: v.float64(), // 1 or 2
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) throw new Error("User not found");

    if (args.votedForTeam !== 1 && args.votedForTeam !== 2) {
      throw new Error("Must vote for team 1 or 2");
    }

    // Check for existing vote
    let existing = null;
    if (args.matchId) {
      existing = await ctx.db
        .query("fan_votes")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .first();
    } else if (args.tournamentMatchId) {
      existing = await ctx.db
        .query("fan_votes")
        .withIndex("by_tournament_match", (q) => q.eq("tournamentMatchId", args.tournamentMatchId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .first();
    }

    if (existing) {
      // Update vote
      await ctx.db.patch(existing._id, {
        votedForTeam: args.votedForTeam,
        votedAt: BigInt(Date.now()),
      });
    } else {
      // New vote
      await ctx.db.insert("fan_votes", {
        matchId: args.matchId,
        tournamentMatchId: args.tournamentMatchId,
        userId: user._id,
        votedForTeam: args.votedForTeam,
        votedAt: BigInt(Date.now()),
      });
    }

    return { success: true };
  },
});

/**
 * Get fan vote results
 */
export const getFanVotes = query({
  args: {
    matchId: v.optional(v.id("matches")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
  },
  handler: async (ctx, args) => {
    let votes;
    if (args.matchId) {
      votes = await ctx.db
        .query("fan_votes")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect();
    } else if (args.tournamentMatchId) {
      votes = await ctx.db
        .query("fan_votes")
        .withIndex("by_tournament_match", (q) => q.eq("tournamentMatchId", args.tournamentMatchId))
        .collect();
    } else {
      return { team1Votes: 0, team2Votes: 0, team1Percent: 50, team2Percent: 50, totalVotes: 0 };
    }

    const team1Votes = votes.filter(v => v.votedForTeam === 1).length;
    const team2Votes = votes.filter(v => v.votedForTeam === 2).length;
    const totalVotes = team1Votes + team2Votes;

    const team1Percent = totalVotes > 0 ? Math.round((team1Votes / totalVotes) * 100) : 50;
    const team2Percent = totalVotes > 0 ? 100 - team1Percent : 50;

    return {
      team1Votes,
      team2Votes,
      team1Percent,
      team2Percent,
      totalVotes,
    };
  },
});

/**
 * Get user's vote
 */
export const getMyVote = query({
  args: {
    matchId: v.optional(v.id("matches")),
    tournamentMatchId: v.optional(v.id("tournament_matches")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    let vote = null;
    if (args.matchId) {
      vote = await ctx.db
        .query("fan_votes")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .first();
    } else if (args.tournamentMatchId) {
      vote = await ctx.db
        .query("fan_votes")
        .withIndex("by_tournament_match", (q) => q.eq("tournamentMatchId", args.tournamentMatchId))
        .filter((q) => q.eq(q.field("userId"), user._id))
        .first();
    }

    return vote ? vote.votedForTeam : null;
  },
});

/**
 * Get head-to-head history between two organizations
 */
export const getHeadToHead = query({
  args: {
    org1Id: v.id("organizations"),
    org2Id: v.id("organizations"),
    limit: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;

    // Get matches where org1 played against org2
    const matches = await ctx.db
      .query("org_matches")
      .withIndex("by_org", (q) => q.eq("orgId", args.org1Id))
      .filter((q) => q.eq(q.field("opponentOrgId"), args.org2Id))
      .order("desc")
      .take(limit);

    const org1Wins = matches.filter(m => m.isWin).length;
    const org2Wins = matches.length - org1Wins;

    // Get org info
    const org1 = await ctx.db.get(args.org1Id);
    const org2 = await ctx.db.get(args.org2Id);

    return {
      org1: org1 ? { name: org1.name, tag: org1.tag, logoUrl: org1.logoUrl } : null,
      org2: org2 ? { name: org2.name, tag: org2.tag, logoUrl: org2.logoUrl } : null,
      org1Wins,
      org2Wins,
      totalMatches: matches.length,
      matches: matches.map(m => ({
        map: m.map,
        scoreUs: m.scoreUs,
        scoreThem: m.scoreThem,
        isWin: m.isWin,
        playedAt: Number(m.playedAt),
      })),
    };
  },
});

/**
 * Get match room data (lineups, veto, votes)
 */
export const getMatchRoomData = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    // Get team members
    const teamA = await Promise.all(
      match.teamA.map(async (userId) => {
        const user = await ctx.db.get(userId);
        const stats = await ctx.db
          .query("player_stats")
          .withIndex("by_user_match", (q) => q.eq("userId", userId).eq("matchId", args.matchId))
          .first();
        return user ? {
          _id: user._id,
          nickname: user.nickname,
          steamName: user.steamName,
          steamAvatar: user.steamAvatar,
          elo: user.elo_5v5,
          isConnected: stats?.connected || false,
          isReady: stats?.isReady || false,
        } : null;
      })
    );

    const teamB = await Promise.all(
      match.teamB.map(async (userId) => {
        const user = await ctx.db.get(userId);
        const stats = await ctx.db
          .query("player_stats")
          .withIndex("by_user_match", (q) => q.eq("userId", userId).eq("matchId", args.matchId))
          .first();
        return user ? {
          _id: user._id,
          nickname: user.nickname,
          steamName: user.steamName,
          steamAvatar: user.steamAvatar,
          elo: user.elo_5v5,
          isConnected: stats?.connected || false,
          isReady: stats?.isReady || false,
        } : null;
      })
    );

    // Get veto
    const veto = await ctx.db
      .query("match_vetos")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();

    // Get fan votes
    const votes = await ctx.db
      .query("fan_votes")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    const team1Votes = votes.filter(v => v.votedForTeam === 1).length;
    const team2Votes = votes.filter(v => v.votedForTeam === 2).length;
    const totalVotes = team1Votes + team2Votes;

    return {
      match: {
        _id: match._id,
        state: match.state,
        mode: match.mode,
        selectedMap: match.selectedMap,
        serverIp: match.serverIp,
        scoreTeamA: match.scoreTeamA || 0,
        scoreTeamB: match.scoreTeamB || 0,
      },
      teamA: teamA.filter(Boolean),
      teamB: teamB.filter(Boolean),
      veto: veto ? {
        phase: veto.phase,
        currentTurn: veto.currentTurn,
        bans: veto.bans,
        picks: veto.picks,
        availableMaps: veto.mapPool.filter(m => 
          !veto.bans.map(b => b.map).includes(m) && 
          !veto.picks.map(p => p.map).includes(m)
        ),
      } : null,
      fanVotes: {
        team1Votes,
        team2Votes,
        team1Percent: totalVotes > 0 ? Math.round((team1Votes / totalVotes) * 100) : 50,
        team2Percent: totalVotes > 0 ? Math.round((team2Votes / totalVotes) * 100) : 50,
        totalVotes,
      },
    };
  },
});
