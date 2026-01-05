import { internalMutation } from "./_generated/server";

// PHASE 11 SPECIAL: Simplified 1v1 matchmaking with ELO consideration
export const checkMatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const matchesCreated = [];

    // Only check 1v1 queue
    const queueEntries = await ctx.db
      .query("queue_entries")
      .withIndex("by_mode", (q) => q.eq("mode", "1v1"))
      .collect();

    if (queueEntries.length < 2) {
      return { matchesCreated: 0, matches: [] };
    }

    // Sort by join time (FIFO)
    queueEntries.sort((a, b) => Number(a.joinedAt - b.joinedAt));

    // Get ELO for players and try to match similar ELO
    const playersWithElo = await Promise.all(
      queueEntries.map(async (entry) => {
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

      // 1v1 specific maps (aim maps)
      const mapPool = [
        "aim_map",
        "awp_lego_2",
        "aim_redline",
        "fy_pool_day",
        "aim_ag_texture_city_advanced",
      ];

      // Location pool for veto
      const locationPool = ["Frankfurt", "Paris", "Madrid"];

      const matchId = await ctx.db.insert("matches", {
        state: "VETO", // Start with location veto
        mode: "1v1",
        teamA: [player1.userId],
        teamB: [player2.userId],
        mapPool,
        bannedMaps: [],
        locationPool,
        bannedLocations: [],
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
  },
});

// 5v5 DISABLED FOR PHASE 11 SPECIAL
// TODO: Re-enable 5v5 in future phase
