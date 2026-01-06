import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * FASE 28: SISTEMA DE BADGES & CONQUISTAS
 * Badges automáticos baseados em achievements
 */

interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  check: (stats: any) => boolean;
}

const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: "early_adopter",
    name: "Early Adopter",
    description: "Registado na primeira semana",
    icon: "🌟",
    check: (stats) => stats.accountAge < 7,
  },
  {
    id: "winstreak_5",
    name: "Winstreak 5",
    description: "Ganhou 5 partidas seguidas",
    icon: "🔥",
    check: (stats) => stats.currentWinstreak >= 5,
  },
  {
    id: "sniper_elite",
    name: "Sniper Elite",
    description: "Ganhou 10 jogos em mapas AWP",
    icon: "🎯",
    check: (stats) => stats.awpWins >= 10,
  },
  {
    id: "headhunter",
    name: "Headhunter",
    description: "70%+ de headshots em 10+ jogos",
    icon: "💀",
    check: (stats) => stats.hsPercentage >= 70 && stats.totalMatches >= 10,
  },
  {
    id: "veteran",
    name: "Veteran",
    description: "Jogou 100 partidas",
    icon: "🏅",
    check: (stats) => stats.totalMatches >= 100,
  },
  {
    id: "champion",
    name: "Champion",
    description: "Atingiu Grandmaster (Level 10)",
    icon: "👑",
    check: (stats) => stats.level >= 10,
  },
  {
    id: "comeback_king",
    name: "Comeback King",
    description: "Ganhou 5 jogos após estar 0-5",
    icon: "⚡",
    check: (stats) => stats.comebacks >= 5,
  },
  {
    id: "ace_master",
    name: "Ace Master",
    description: "Fez 10 aces",
    icon: "🎖️",
    check: (stats) => stats.totalAces >= 10,
  },
];

/**
 * Check and award badges to user
 * Called after each match
 */
export const checkAndAwardBadges = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return;

    // Get existing badges
    const existingBadges = await ctx.db
      .query("user_badges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    // Calculate stats for badge checks
    const stats = await calculateUserStats(ctx, args.userId);

    // Check each badge
    for (const badgeDef of BADGE_DEFINITIONS) {
      // Skip if already earned
      if (existingBadgeIds.has(badgeDef.id)) continue;

      // Check if user qualifies
      if (badgeDef.check(stats)) {
        // Award badge
        await ctx.db.insert("user_badges", {
          userId: args.userId,
          badgeId: badgeDef.id,
          name: badgeDef.name,
          description: badgeDef.description,
          icon: badgeDef.icon,
          earnedAt: BigInt(Date.now()),
        });

        // Send notification
        await ctx.scheduler.runAfter(0, internal.notifications.sendNotification, {
          userId: args.userId,
          title: `🏆 Nova Conquista: ${badgeDef.name}!`,
          message: badgeDef.description,
          type: "SYSTEM",
        });

        console.log(`🏆 Badge awarded: ${badgeDef.name} to user ${user.steamName || user.clerkId}`);
      }
    }
  },
});

/**
 * Calculate user stats for badge checks
 */
async function calculateUserStats(ctx: any, userId: any) {
  const user = await ctx.db.get(userId);
  
  // Get all finished matches
  const allMatches = await ctx.db
    .query("matches")
    .filter((q: any) => q.eq(q.field("state"), "FINISHED"))
    .collect();

  const userMatches = allMatches.filter(
    (m: any) => m.teamA.includes(userId) || m.teamB.includes(userId)
  );

  // Get player stats
  const playerStats = await ctx.db
    .query("player_stats")
    .withIndex("by_user_match", (q: any) => q.eq("userId", userId))
    .collect();

  // Calculate winstreak
  let currentWinstreak = 0;
  const recentMatches = userMatches.slice(-10).reverse();
  for (const match of recentMatches) {
    const isInTeamA = match.teamA.includes(userId);
    const won = match.winnerId
      ? isInTeamA
        ? match.teamA.includes(match.winnerId)
        : match.teamB.includes(match.winnerId)
      : false;

    if (won) {
      currentWinstreak++;
    } else {
      break;
    }
  }

  // AWP map wins
  const awpWins = userMatches.filter((m: any) => {
    const isAwpMap = m.selectedMap?.toLowerCase().includes("awp");
    const isInTeamA = m.teamA.includes(userId);
    const won = m.winnerId
      ? isInTeamA
        ? m.teamA.includes(m.winnerId)
        : m.teamB.includes(m.winnerId)
      : false;
    return isAwpMap && won;
  }).length;

  // Headshot percentage
  const totalKills = playerStats.reduce((sum: number, s: any) => sum + s.kills, 0);
  const totalHeadshots = playerStats.reduce((sum: number, s: any) => sum + (s.headshots || 0), 0);
  const hsPercentage = totalKills > 0 ? (totalHeadshots / totalKills) * 100 : 0;

  // Total aces
  const totalAces = playerStats.reduce((sum: number, s: any) => sum + (s.aces || 0), 0);

  // Account age (days)
  const accountAge = Math.floor((Date.now() - user._creationTime) / (1000 * 60 * 60 * 24));

  // Level
  const elo = user.elo_1v1;
  const level = elo >= 2100 ? 10 : elo >= 1901 ? 9 : elo >= 1701 ? 8 : elo >= 1501 ? 7 : elo >= 1351 ? 6 : elo >= 1201 ? 5 : elo >= 1101 ? 4 : elo >= 951 ? 3 : elo >= 801 ? 2 : 1;

  return {
    totalMatches: userMatches.length,
    currentWinstreak,
    awpWins,
    hsPercentage,
    totalAces,
    accountAge,
    level,
    comebacks: 0, // TODO: Implement comeback tracking
  };
}

/**
 * Get user badges
 */
export const getUserBadges = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_badges")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});
