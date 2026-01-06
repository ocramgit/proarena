"use client";

import { getLevelFromElo } from "@/utils/levels20";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * FASE 29: LEVEL BADGE 1-20
 * Badge circular com número do nível e cores progressivas
 */

interface LevelBadgeProps {
  elo: number;
  size?: "sm" | "md" | "lg" | "xl";
  showTooltip?: boolean;
}

export function LevelBadge20({ elo, size = "md", showTooltip = true }: LevelBadgeProps) {
  const levelData = getLevelFromElo(elo);

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-14 h-14 text-lg",
    xl: "w-20 h-20 text-2xl",
  };

  const badge = (
    <div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${levelData.gradient} flex items-center justify-center font-black text-white shadow-lg border-2 border-white/20 relative`}
      style={{
        boxShadow: `0 0 20px ${levelData.color}40`,
      }}
    >
      <span className="relative z-10">{levelData.level}</span>
      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent className="bg-zinc-900 border-zinc-800">
          <div className="text-center">
            <div className="text-xs text-zinc-400">Nível {levelData.level}</div>
            <div className="font-bold" style={{ color: levelData.color }}>
              {levelData.name}
            </div>
            <div className="text-xs text-zinc-500 mt-1">{elo} ELO</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
