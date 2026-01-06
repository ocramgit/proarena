/**
 * FASE 29: SISTEMA DE NÍVEIS 1-20
 * Escala suave de progressão com cores visuais
 */

export interface LevelTier {
  level: number;
  name: string;
  minElo: number;
  maxElo: number;
  color: string;
  gradient: string;
  icon: string;
}

export const LEVEL_TIERS: LevelTier[] = [
  // Níveis 1-5: Cinzento
  { level: 1, name: "1", minElo: 0, maxElo: 200, color: "#71717a", gradient: "from-zinc-600 to-zinc-700", icon: "" },
  { level: 2, name: "2", minElo: 200, maxElo: 400, color: "#71717a", gradient: "from-zinc-500 to-zinc-600", icon: "" },
  { level: 3, name: "3", minElo: 400, maxElo: 600, color: "#a1a1aa", gradient: "from-zinc-400 to-zinc-500", icon: "" },
  { level: 4, name: "4", minElo: 600, maxElo: 800, color: "#a1a1aa", gradient: "from-zinc-400 to-zinc-500", icon: "" },
  { level: 5, name: "5", minElo: 800, maxElo: 1000, color: "#d4d4d8", gradient: "from-zinc-300 to-zinc-400", icon: "" },
  
  // Níveis 6-10: Verde
  { level: 6, name: "6", minElo: 1000, maxElo: 1200, color: "#22c55e", gradient: "from-green-600 to-green-700", icon: "" },
  { level: 7, name: "7", minElo: 1200, maxElo: 1400, color: "#22c55e", gradient: "from-green-500 to-green-600", icon: "" },
  { level: 8, name: "8", minElo: 1400, maxElo: 1600, color: "#10b981", gradient: "from-emerald-500 to-green-600", icon: "" },
  { level: 9, name: "9", minElo: 1600, maxElo: 1800, color: "#10b981", gradient: "from-emerald-400 to-emerald-500", icon: "" },
  { level: 10, name: "10", minElo: 1800, maxElo: 2000, color: "#14b8a6", gradient: "from-teal-500 to-emerald-500", icon: "" },
  
  // Níveis 11-15: Azul/Roxo
  { level: 11, name: "11", minElo: 2000, maxElo: 2200, color: "#3b82f6", gradient: "from-blue-600 to-blue-700", icon: "" },
  { level: 12, name: "12", minElo: 2200, maxElo: 2400, color: "#3b82f6", gradient: "from-blue-500 to-blue-600", icon: "" },
  { level: 13, name: "13", minElo: 2400, maxElo: 2600, color: "#8b5cf6", gradient: "from-violet-600 to-purple-600", icon: "" },
  { level: 14, name: "14", minElo: 2600, maxElo: 2800, color: "#8b5cf6", gradient: "from-violet-500 to-purple-500", icon: "" },
  { level: 15, name: "15", minElo: 2800, maxElo: 3000, color: "#a855f7", gradient: "from-purple-500 to-fuchsia-500", icon: "" },
  
  // Níveis 16-20: Dourado/Vermelho
  { level: 16, name: "16", minElo: 3000, maxElo: 3300, color: "#eab308", gradient: "from-yellow-600 to-amber-600", icon: "" },
  { level: 17, name: "17", minElo: 3300, maxElo: 3600, color: "#eab308", gradient: "from-yellow-500 to-amber-500", icon: "" },
  { level: 18, name: "18", minElo: 3600, maxElo: 4000, color: "#f59e0b", gradient: "from-amber-500 to-orange-500", icon: "" },
  { level: 19, name: "19", minElo: 4000, maxElo: 5000, color: "#f97316", gradient: "from-orange-400 to-red-500", icon: "" },
  { level: 20, name: "20", minElo: 5000, maxElo: Infinity, color: "#ef4444", gradient: "from-red-500 to-rose-600", icon: "" },
];

/**
 * Get level tier from ELO
 */
export function getLevelFromElo(elo: number): LevelTier {
  for (const tier of LEVEL_TIERS) {
    if (elo >= tier.minElo && elo < tier.maxElo) {
      return tier;
    }
  }
  return LEVEL_TIERS[LEVEL_TIERS.length - 1]; // Default to max level
}

/**
 * Get progress to next level
 */
export function getProgressToNextLevel(elo: number) {
  const current = getLevelFromElo(elo);
  const currentIndex = LEVEL_TIERS.findIndex(t => t.level === current.level);
  const next = LEVEL_TIERS[currentIndex + 1];

  if (!next) {
    return {
      current,
      next: null,
      progress: 100,
      eloNeeded: 0,
    };
  }

  const eloInCurrentTier = elo - current.minElo;
  const eloRangeInTier = current.maxElo - current.minElo;
  const progress = Math.min(100, (eloInCurrentTier / eloRangeInTier) * 100);
  const eloNeeded = next.minElo - elo;

  return {
    current,
    next,
    progress,
    eloNeeded: Math.max(0, eloNeeded),
  };
}

/**
 * Get average stats for a level (for radar chart comparison)
 */
export function getAverageStatsForLevel(level: number) {
  // Escala progressiva de stats baseada no nível
  const baseKD = 0.8 + (level * 0.06); // 0.8 -> 2.0
  const baseWinRate = 45 + (level * 1.5); // 45% -> 75%
  const baseHS = 35 + (level * 1.5); // 35% -> 65%
  const baseSurvival = 20 + (level * 2); // 20% -> 60%
  const baseMultiKills = 0.1 + (level * 0.05); // 0.1 -> 1.1

  return {
    kd: Math.min(2.5, baseKD),
    winRate: Math.min(75, baseWinRate),
    hsPercentage: Math.min(70, baseHS),
    survivalRate: Math.min(65, baseSurvival),
    multiKills: Math.min(1.5, baseMultiKills),
  };
}
