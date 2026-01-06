/**
 * FASE 28: SISTEMA DE NÍVEIS
 * Converte ELO em níveis visuais (1-10) com ícones e cores
 */

export interface LevelTier {
  level: number;
  name: string;
  minElo: number;
  maxElo: number;
  color: string;
  icon: string; // SVG path or emoji
}

export const LEVEL_TIERS: LevelTier[] = [
  {
    level: 1,
    name: "Bronze I",
    minElo: 0,
    maxElo: 800,
    color: "#CD7F32",
    icon: "🥉",
  },
  {
    level: 2,
    name: "Bronze II",
    minElo: 801,
    maxElo: 950,
    color: "#CD7F32",
    icon: "🥉",
  },
  {
    level: 3,
    name: "Silver I",
    minElo: 951,
    maxElo: 1100,
    color: "#C0C0C0",
    icon: "🥈",
  },
  {
    level: 4,
    name: "Silver II",
    minElo: 1101,
    maxElo: 1200,
    color: "#C0C0C0",
    icon: "🥈",
  },
  {
    level: 5,
    name: "Gold I",
    minElo: 1201,
    maxElo: 1350,
    color: "#FFD700",
    icon: "🥇",
  },
  {
    level: 6,
    name: "Gold II",
    minElo: 1351,
    maxElo: 1500,
    color: "#FFD700",
    icon: "🥇",
  },
  {
    level: 7,
    name: "Platinum",
    minElo: 1501,
    maxElo: 1700,
    color: "#E5E4E2",
    icon: "💎",
  },
  {
    level: 8,
    name: "Diamond",
    minElo: 1701,
    maxElo: 1900,
    color: "#B9F2FF",
    icon: "💠",
  },
  {
    level: 9,
    name: "Master",
    minElo: 1901,
    maxElo: 2099,
    color: "#FF6B6B",
    icon: "👑",
  },
  {
    level: 10,
    name: "Grandmaster",
    minElo: 2100,
    maxElo: 9999,
    color: "#FF1744",
    icon: "🔥",
  },
];

/**
 * Get level tier from ELO
 */
export function getLevelFromElo(elo: number): LevelTier {
  for (const tier of LEVEL_TIERS) {
    if (elo >= tier.minElo && elo <= tier.maxElo) {
      return tier;
    }
  }
  // Fallback to level 1
  return LEVEL_TIERS[0];
}

/**
 * Calculate progress to next level (0-100%)
 */
export function getProgressToNextLevel(elo: number): {
  current: LevelTier;
  next: LevelTier | null;
  progress: number;
  eloNeeded: number;
} {
  const current = getLevelFromElo(elo);
  const currentIndex = LEVEL_TIERS.findIndex((t) => t.level === current.level);
  const next = currentIndex < LEVEL_TIERS.length - 1 ? LEVEL_TIERS[currentIndex + 1] : null;

  if (!next) {
    return {
      current,
      next: null,
      progress: 100,
      eloNeeded: 0,
    };
  }

  const eloInCurrentTier = elo - current.minElo;
  const tierRange = current.maxElo - current.minElo;
  const progress = Math.min(100, (eloInCurrentTier / tierRange) * 100);
  const eloNeeded = next.minElo - elo;

  return {
    current,
    next,
    progress,
    eloNeeded: Math.max(0, eloNeeded),
  };
}

/**
 * Get level badge component props
 */
export function getLevelBadgeProps(elo: number): {
  level: number;
  name: string;
  color: string;
  icon: string;
} {
  const tier = getLevelFromElo(elo);
  return {
    level: tier.level,
    name: tier.name,
    color: tier.color,
    icon: tier.icon,
  };
}

/**
 * Calculate average stats for a level tier
 * Used for radar chart comparison
 */
export function getAverageStatsForLevel(level: number): {
  kd: number;
  winRate: number;
  hsPercentage: number;
  survivalRate: number;
  multiKills: number;
} {
  // Baseline stats that scale with level
  const baseKD = 0.8 + (level * 0.15);
  const baseWinRate = 40 + (level * 4);
  const baseHS = 30 + (level * 5);
  const baseSurvival = 35 + (level * 4);
  const baseMulti = 0.5 + (level * 0.3);

  return {
    kd: Math.min(2.5, baseKD),
    winRate: Math.min(75, baseWinRate),
    hsPercentage: Math.min(70, baseHS),
    survivalRate: Math.min(65, baseSurvival),
    multiKills: Math.min(4, baseMulti),
  };
}
