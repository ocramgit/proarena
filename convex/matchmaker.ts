import { internalMutation } from "./_generated/server";

export const checkMatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const modes: Array<"1v1" | "5v5"> = ["1v1", "5v5"];
    const matchesCreated = [];

    for (const mode of modes) {
      const requiredPlayers = mode === "1v1" ? 2 : 10;

      const queueEntries = await ctx.db
        .query("queue_entries")
        .withIndex("by_mode", (q) => q.eq("mode", mode))
        .collect();

      if (queueEntries.length < requiredPlayers) {
        continue;
      }

      queueEntries.sort((a, b) => Number(a.joinedAt - b.joinedAt));

      const selectedPlayers = queueEntries.slice(0, requiredPlayers);
      const playerIds = selectedPlayers.map((entry) => entry.userId);

      const teamASize = mode === "1v1" ? 1 : 5;
      const teamA = playerIds.slice(0, teamASize);
      const teamB = playerIds.slice(teamASize);

      const mapPool = [
        "de_mirage",
        "de_inferno",
        "de_dust2",
        "de_nuke",
        "de_overpass",
        "de_vertigo",
        "de_ancient",
      ];

      const matchId = await ctx.db.insert("matches", {
        state: "VETO",
        mode,
        teamA,
        teamB,
        mapPool,
        bannedMaps: [],
      });

      for (const entry of selectedPlayers) {
        await ctx.db.delete(entry._id);
      }

      matchesCreated.push(matchId);
    }

    return {
      matchesCreated: matchesCreated.length,
      matches: matchesCreated,
    };
  },
});
