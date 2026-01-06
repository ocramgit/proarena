"use client";

import { getLevelBadgeProps } from "@/utils/levels";

/**
 * FASE 28: LEVEL BADGE COMPONENT
 * Mostra o nível do jogador com ícone e cor
 */

interface LevelBadgeProps {
  elo: number;
  size?: "sm" | "md" | "lg";
  showName?: boolean;
  showElo?: boolean;
}

export function LevelBadge({ elo, size = "md", showName = false, showElo = false }: LevelBadgeProps) {
  const { level, name, color, icon } = getLevelBadgeProps(elo);

  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-10 h-10 text-base",
    lg: "w-16 h-16 text-2xl",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex items-center gap-2">
      {/* Badge */}
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold shadow-lg`}
        style={{
          background: `linear-gradient(135deg, ${color}dd, ${color}88)`,
          border: `2px solid ${color}`,
          boxShadow: `0 0 10px ${color}66`,
        }}
        title={`${name} (${elo} ELO)`}
      >
        <span>{icon}</span>
      </div>

      {/* Text Info */}
      {(showName || showElo) && (
        <div className="flex flex-col">
          {showName && (
            <span className={`${textSizeClasses[size]} font-bold`} style={{ color }}>
              {name}
            </span>
          )}
          {showElo && (
            <span className={`${textSizeClasses[size]} text-zinc-400`}>
              {elo} ELO
            </span>
          )}
        </div>
      )}
    </div>
  );
}
