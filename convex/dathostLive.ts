import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Fetch live match data from DatHost cs2-matches endpoint
export const fetchLiveMatchData = action({
  args: {
    dathostMatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      console.error("DatHost credentials not configured");
      return null;
    }

    const auth = btoa(`${username}:${password}`);

    try {
      const response = await fetch(
        `https://dathost.net/api/0.1/cs2-matches/${args.dathostMatchId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      if (!response.ok) {
        console.error("Failed to get live match data:", response.statusText);
        return null;
      }

      const matchData = await response.json();
      
      // Extract relevant live data
      return {
        team1Score: matchData.team1?.stats?.score || 0,
        team2Score: matchData.team2?.stats?.score || 0,
        roundsPlayed: matchData.rounds_played || 0,
        finished: matchData.finished || false,
        players: matchData.players?.map((p: any) => ({
          steamId64: p.steam_id_64,
          team: p.team,
          connected: p.connected,
          kills: p.stats?.kills || 0,
          deaths: p.stats?.deaths || 0,
          assists: p.stats?.assists || 0,
          mvps: p.stats?.mvps || 0,
          score: p.stats?.score || 0,
        })) || [],
      };
    } catch (error: any) {
      console.error("Error fetching live match data:", error.message);
      return null;
    }
  },
});
