import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Global lock to prevent race conditions in matchmaking
let matchmakingInProgress = false;

// PHASE 11 SPECIAL: Simplified 1v1 matchmaking with ELO consideration
export const checkMatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Prevent concurrent matchmaking runs
    if (matchmakingInProgress) {
      console.log("⏸️ Matchmaking already in progress, skipping...");
      return { matchesCreated: 0, matches: [] };
    }

    matchmakingInProgress = true;
    
    try {
      const matchesCreated = [];

      // Only check 1v1 queue
      const queueEntries = await ctx.db
        .query("queue_entries")
        .withIndex("by_mode", (q) => q.eq("mode", "1v1"))
        .collect();

      if (queueEntries.length < 2) {
        return { matchesCreated: 0, matches: [] };
      }

      // Filter out players with active cooldown OR already in a match
      const now = Date.now();
      const validEntries = [];
      
      for (const entry of queueEntries) {
        // Check cooldown
        if (entry.cooldownUntil && Number(entry.cooldownUntil) > now) {
          continue;
        }
        
        // Check if player already has an active match
        const existingMatch = await ctx.db
          .query("matches")
          .filter((q) => 
            q.and(
              q.or(
                q.eq(q.field("teamA"), [entry.userId]),
                q.eq(q.field("teamB"), [entry.userId])
              ),
              q.or(
                q.eq(q.field("state"), "CONFIRMING"),
                q.eq(q.field("state"), "VETO"),
                q.eq(q.field("state"), "CONFIGURING"),
                q.eq(q.field("state"), "WARMUP"),
                q.eq(q.field("state"), "LIVE")
              )
            )
          )
          .first();
        
        if (existingMatch) {
          console.log(`⚠️ Player ${entry.userId} already in match ${existingMatch._id}, skipping`);
          continue;
        }
        
        validEntries.push(entry);
      }

      if (validEntries.length < 2) {
        return { matchesCreated: 0, matches: [] };
      }

    // Sort by join time (FIFO)
    validEntries.sort((a, b) => Number(a.joinedAt - b.joinedAt));

    // Get ELO for players and try to match similar ELO
    const playersWithElo = await Promise.all(
      validEntries.map(async (entry) => {
        const user = await ctx.db.get(entry.userId);
        return {
          entry,
          elo: user?.elo_1v1 || 1000,
          userId: entry.userId,
        };
      })
    );

    // Match players with closest ELO (within 200 points if possible)
    while (playersWithElo.length >= 2) {
      const player1 = playersWithElo.shift()!;
      
      // Find closest ELO opponent
      let closestIndex = 0;
      let closestDiff = Math.abs(playersWithElo[0].elo - player1.elo);
      
      for (let i = 1; i < playersWithElo.length; i++) {
        const diff = Math.abs(playersWithElo[i].elo - player1.elo);
        if (diff < closestDiff) {
          closestDiff = diff;
          closestIndex = i;
        }
      }
      
      const player2 = playersWithElo.splice(closestIndex, 1)[0];

      const mapPool = [
        "de_dust2",
        "de_mirage",
        "de_inferno",
        "de_ancient",
        "de_nuke",
        "de_anubis",
      ];

      // Location pool for veto (DatHost CS2 API location IDs)
      const locationPool = ["dusseldorf", "strasbourg", "barcelona"];

      // Create match in CONFIRMING state
      const confirmationDeadline = Date.now() + 20 * 1000; // 20 seconds
      const matchId = await ctx.db.insert("matches", {
        state: "CONFIRMING",
        mode: "1v1",
        teamA: [player1.userId],
        teamB: [player2.userId],
        acceptedPlayers: [],
        confirmationDeadline: BigInt(confirmationDeadline),
        mapPool,
        bannedMaps: [],
        locationPool,
        bannedLocations: [],
      });

      console.log(`🎮 Match created in CONFIRMING state: ${matchId}`);

      // Schedule timeout handler (20 seconds)
      await ctx.scheduler.runAfter(20000, internal.matchConfirmation.handleConfirmationTimeout, {
        matchId,
      });

      // Remove from queue
      await ctx.db.delete(player1.entry._id);
      await ctx.db.delete(player2.entry._id);

      matchesCreated.push(matchId);
    }

      return {
        matchesCreated: matchesCreated.length,
        matches: matchesCreated,
      };
    } finally {
      matchmakingInProgress = false;
    }
  },
});

// 5v5 DISABLED FOR PHASE 11 SPECIAL
// TODO: Re-enable 5v5 in future phase
