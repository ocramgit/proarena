"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

/**
 * FASE 54: LIVE MATCH TICKER COMPONENT
 * HLTV-style match ticker bar
 */

interface MatchTickerProps {
  limit?: number;
  compact?: boolean;
}

export function MatchTicker({ limit = 10, compact = false }: MatchTickerProps) {
  const liveTicker = useQuery(api.newsroom.getLiveTicker, { limit });

  if (!liveTicker || liveTicker.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-2">
        {liveTicker.map((match: any) => (
          <div 
            key={match._id}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap ${
              match.status === "LIVE" 
                ? "bg-red-500/10 border border-red-500/30" 
                : "bg-zinc-800/50"
            }`}
          >
            {match.status === "LIVE" && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <span className="text-sm font-medium text-white">{match.team1Name}</span>
            <span className="text-sm font-bold text-zinc-400">
              {match.score1} - {match.score2}
            </span>
            <span className="text-sm font-medium text-white">{match.team2Name}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 overflow-x-auto">
      <div className="flex items-center gap-6 min-w-max">
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
        {liveTicker.map((match: any) => (
          <Link 
            key={match._id}
            href={match.tournamentMatchId ? `/tournaments/${match.tournamentMatchId}` : "#"}
            className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors ${
              match.status === "LIVE" 
                ? "bg-red-500/10 border border-red-500/30 hover:bg-red-500/20" 
                : match.status === "FINISHED"
                ? "bg-zinc-800/30 hover:bg-zinc-800/50"
                : "bg-zinc-800/50 hover:bg-zinc-800/70"
            }`}
          >
            {match.status === "LIVE" && (
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            )}
            <div className="flex items-center gap-2">
              {match.team1Logo && (
                <img src={match.team1Logo} alt="" className="w-5 h-5 rounded" />
              )}
              <span className="text-sm font-medium text-white">{match.team1Name}</span>
              <span className={`text-sm font-bold ${
                match.status === "LIVE" ? "text-white" : "text-zinc-400"
              }`}>
                {match.score1}
              </span>
            </div>
            <span className="text-zinc-600">-</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${
                match.status === "LIVE" ? "text-white" : "text-zinc-400"
              }`}>
                {match.score2}
              </span>
              <span className="text-sm font-medium text-white">{match.team2Name}</span>
              {match.team2Logo && (
                <img src={match.team2Logo} alt="" className="w-5 h-5 rounded" />
              )}
            </div>
            {match.status === "FINISHED" && (
              <span className="text-xs text-zinc-500">FT</span>
            )}
            {match.status === "UPCOMING" && match.scheduledTime && (
              <span className="text-xs text-zinc-500">
                {new Date(match.scheduledTime).toLocaleTimeString("pt-PT", { 
                  hour: "2-digit", 
                  minute: "2-digit" 
                })}
              </span>
            )}
            {match.map && (
              <span className="text-xs text-zinc-600">{match.map}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
