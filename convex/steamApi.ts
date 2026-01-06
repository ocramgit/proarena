import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * FASE 30: STEAM API INTEGRATION
 * Fetch player data for trust factor calculation
 */

const STEAM_API_KEY = process.env.STEAM_API_KEY || "";
const CS2_APP_ID = "730"; // Counter-Strike 2

interface SteamPlayerBans {
  SteamId: string;
  CommunityBanned: boolean;
  VACBanned: boolean;
  NumberOfVACBans: number;
  DaysSinceLastBan: number;
  NumberOfGameBans: number;
  EconomyBan: string;
}

interface SteamOwnedGame {
  appid: number;
  playtime_forever: number; // in minutes
  playtime_2weeks?: number;
}

/**
 * Fetch Steam player bans
 */
async function fetchPlayerBans(steamId: string): Promise<SteamPlayerBans | null> {
  if (!STEAM_API_KEY) {
    console.warn("STEAM_API_KEY not configured");
    return null;
  }

  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerBans/v1/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.players && data.players.length > 0) {
      return data.players[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching player bans:", error);
    return null;
  }
}

/**
 * Fetch Steam owned games (to get CS2 playtime)
 */
async function fetchOwnedGames(steamId: string): Promise<SteamOwnedGame[]> {
  if (!STEAM_API_KEY) {
    console.warn("STEAM_API_KEY not configured");
    return [];
  }

  try {
    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${STEAM_API_KEY}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`;
    console.log(`🔍 Fetching Steam owned games for ${steamId}...`);
    const response = await fetch(url);
    console.log(`📊 Games response:`, JSON.stringify(response).substring(0, 500));
    const data = await response.json();
    
    console.log(`📊 Games data:`, JSON.stringify(data).substring(0, 500));
    
    if (data.response && data.response.games) {
      return data.response.games;
    }
    return [];
  } catch (error) {
    console.error("Error fetching owned games:", error);
    return [];
  }
}

/**
 * Fetch Steam account creation time
 */
async function fetchAccountAge(steamId: string): Promise<number> {
  if (!STEAM_API_KEY) {
    console.warn("STEAM_API_KEY not configured");
    return 0;
  }

  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${STEAM_API_KEY}&steamids=${steamId}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.response && data.response.players && data.response.players.length > 0) {
      const player = data.response.players[0];
      const creationTime = player.timecreated || 0;
      
      if (creationTime > 0) {
        const now = Math.floor(Date.now() / 1000);
        const ageInSeconds = now - creationTime;
        const ageInDays = Math.floor(ageInSeconds / 86400);
        return ageInDays;
      }
    }
    return 0;
  } catch (error) {
    console.error("Error fetching account age:", error);
    return 0;
  }
}

/**
 * Update user Steam data and calculate trust
 * Called after Steam account linking
 */
export const updateSteamData = internalMutation({
  args: {
    userId: v.id("users"),
    steamId: v.string(),
  },
  handler: async (ctx, args) => {
    // Fetch player bans
    const bansData = await fetchPlayerBans(args.steamId);
    const vacBans = bansData?.NumberOfVACBans || 0;
    const gameBans = bansData?.NumberOfGameBans || 0;

    // Fetch owned games to get CS2 playtime
    const games = await fetchOwnedGames(args.steamId);
    const cs2Game = games.find(g => g.appid.toString() === CS2_APP_ID);
    const playtimeMinutes = cs2Game?.playtime_forever || 0;
    const steamHours = Math.floor(playtimeMinutes / 60);

    console.log(`🎮 CS2 Game found:`, cs2Game);
    console.log(`⏱️ CS2 Hours calculated: ${steamHours}h`);

    // Fetch account age
    const accountAgeDays = await fetchAccountAge(args.steamId);

    // Update user with Steam data
    await ctx.db.patch(args.userId, {
      steamHours,
      steamAccountAge: accountAgeDays,
      vacBans: vacBans,
      gameBans: gameBans,
      lastTrustUpdate: BigInt(Date.now()),
    });

    if (vacBans > 0) {
      await ctx.db.patch(args.userId, {
        isBanned: true,
      });
      console.log(`User ${args.userId} auto-banned due to VAC ban`);
      return { banned: true, reason: "VAC_BAN" };
    }

    // Calculate trust score
    await ctx.scheduler.runAfter(0, internal.trust.calculateTrust, {
      userId: args.userId,
    });

    return {
      banned: false,
      steamHours,
      steamAccountAge: accountAgeDays,
      vacBans,
      gameBans,
    };
  },
});
