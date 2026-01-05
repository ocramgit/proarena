import { v } from "convex/values";
import { action } from "./_generated/server";

// Fetch live match data from DatHost API
// https://dathost.net/reference/get_api-0-1-cs2-matches-match-id
export const fetchDatHostMatchData = action({
  args: {
    dathostMatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const username = process.env.DATHOST_USERNAME;
    const password = process.env.DATHOST_PASSWORD;

    if (!username || !password) {
      throw new Error("DatHost credentials not configured");
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
        throw new Error(`DatHost API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Extract player data - stats are in the players array
      const players = data.players || [];
      const team1Players = players.filter((p: any) => p.team === "team1");
      const team2Players = players.filter((p: any) => p.team === "team2");
      
      // Calculate team ROUNDS WON from MVPs (not score points!)
      const team1Rounds = team1Players.reduce((sum: number, p: any) => sum + (p.stats?.mvps || 0), 0);
      const team2Rounds = team2Players.reduce((sum: number, p: any) => sum + (p.stats?.mvps || 0), 0);
      
      // Extract relevant data
      return {
        finished: data.finished || false,
        status: data.status || "unknown",
        map: data.map || null,
        team1: {
          name: data.team1?.name || "Team A",
          score: team1Rounds, // Rounds won (MVPs)
          players: team1Players.map((p: any) => ({
            steamId: p.steam_id_64,
            kills: p.stats?.kills || 0,
            deaths: p.stats?.deaths || 0,
            assists: p.stats?.assists || 0,
            mvps: p.stats?.mvps || 0,
            scorePoints: p.stats?.score || 0, // Player score points (not rounds)
          })),
        },
        team2: {
          name: data.team2?.name || "Team B",
          score: team2Rounds, // Rounds won (MVPs)
          players: team2Players.map((p: any) => ({
            steamId: p.steam_id_64,
            kills: p.stats?.kills || 0,
            deaths: p.stats?.deaths || 0,
            assists: p.stats?.assists || 0,
            mvps: p.stats?.mvps || 0,
            scorePoints: p.stats?.score || 0, // Player score points (not rounds)
          })),
        },
        players: players,
        spectators: data.spectators || [],
      };
    } catch (error: any) {
      console.error("Error fetching DatHost match data:", error);
      throw error;
    }
  },
});
